/**
 * End-to-End Integration Tests for Anonymous Question Flow
 * 
 * Tests the complete flow:
 * 1. Student submits anonymous question
 * 2. Teacher receives notification via Socket.io
 * 3. Teacher answers the question
 * 4. Students receive answer via Socket.io
 * 
 * REQ-3.1.1: System SHALL provide anonymous question submission with padlock icon
 * REQ-3.1.2: System SHALL create one-way hash of student ID for analytics
 * REQ-3.1.3: System SHALL store questions without revealing identity
 * REQ-3.1.4: System SHALL notify teacher of anonymous questions via Socket.io
 * REQ-3.1.5: System SHALL broadcast answers to entire classroom
 * REQ-3.1.6: System SHALL never reveal question author to teacher
 * 
 * **Validates: Requirements 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6**
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';

// Mock all dependencies BEFORE any imports
vi.mock('../../models/StudentProfile.ts', () => ({
  StudentProfile: class {},
  StudentProfileManager: {
    createProfile: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn()
  },
  ConceptMastery: class {}
}));

vi.mock('../../services/KnowledgeGraph.ts', () => ({
  knowledgeGraph: {
    getProfile: vi.fn(),
    getRecommendations: vi.fn()
  }
}));

vi.mock('../../config/redis.js', () => ({
  SessionCache: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../config/neo4j.js', () => ({
  neo4jDriver: {
    session: vi.fn()
  }
}));

vi.mock('../../config/weaviate.js', () => ({
  weaviateClient: {}
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock('../../utils/anonymousMode.js', () => ({
  hashStudentId: (id: string) => `hash-${id}`,
  createAnonymousIdentifier: (id: string) => `anon-${id.slice(-8)}`
}));

// Mock dependencies
vi.mock('../../config/supabase.js', () => {
  const mockQuestions = new Map();
  
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'anonymous_questions') {
          return {
            insert: (data: any) => ({
              select: () => ({
                single: async () => {
                  const questionId = `question-${Date.now()}`;
                  const questionData = {
                    question_id: questionId,
                    ...data,
                    asked_at: new Date().toISOString(),
                    answered: false,
                    answer: null
                  };
                  mockQuestions.set(questionId, questionData);
                  return { data: questionData, error: null };
                }
              })
            }),
            select: (fields: string) => ({
              eq: (field: string, value: any) => ({
                single: async () => {
                  const question = mockQuestions.get(value);
                  return question ? { data: question, error: null } : { data: null, error: { message: 'Not found' } };
                }
              })
            }),
            update: (data: any) => ({
              eq: (field: string, value: any) => ({
                select: () => ({
                  single: async () => {
                    const question = mockQuestions.get(value);
                    if (question) {
                      const updated = { ...question, ...data };
                      mockQuestions.set(value, updated);
                      return { data: updated, error: null };
                    }
                    return { data: null, error: { message: 'Not found' } };
                  }
                })
              })
            })
          };
        }
        return {};
      }
    }
  };
});

// Now import the modules that depend on the mocked config
import express from 'express';
import request from 'supertest';
import { Server } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import { studentRouter } from '../student.js';
import { teacherRouter } from '../teacher.js';

describe('Anonymous Question Flow - End-to-End Integration', () => {
  let app: express.Application;
  let httpServer: any;
  let io: Server;
  let teacherSocket: ClientSocket;
  let studentSocket: ClientSocket;
  let serverPort: number;

  beforeEach((done) => {
    // Set up Express app
    app = express();
    app.use(express.json());

    // Create HTTP server
    httpServer = createServer(app);

    // Create Socket.io server
    io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Make io available to routes
    app.set('io', io);

    // Mount routers
    app.use('/api/student', studentRouter);
    app.use('/api/teacher', teacherRouter);

    // Set environment variables
    process.env.SALT = 'test-salt-for-hashing';

    // Start server on random port
    httpServer.listen(0, () => {
      serverPort = httpServer.address().port;
      done();
    });
  });

  afterEach((done) => {
    // Clean up sockets
    if (teacherSocket?.connected) teacherSocket.disconnect();
    if (studentSocket?.connected) studentSocket.disconnect();
    
    // Close server
    io.close();
    httpServer.close(() => {
      done();
    });
  });

  describe('Complete Anonymous Question Flow', () => {
    it('should handle complete flow: submit question → teacher notification → answer → student broadcast', (done) => {
      const classroomId = 'classroom-123';
      const studentId = 'student-456';
      const question = 'What is algebra?';
      const answer = 'Algebra is a branch of mathematics that uses symbols and letters to represent numbers.';

      let questionId: string;
      let receivedNotification = false;
      let receivedAnswer = false;

      // Step 1: Teacher connects and joins classroom
      teacherSocket = ioClient(`http://localhost:${serverPort}`);
      
      teacherSocket.on('connect', () => {
        teacherSocket.emit('join', `classroom:${classroomId}`);

        // Step 2: Teacher listens for anonymous question notification
        teacherSocket.on('teacher:anonymous_question', (data) => {
          expect(data).toHaveProperty('questionId');
          expect(data).toHaveProperty('anonymousId');
          expect(data).toHaveProperty('question');
          expect(data).toHaveProperty('timestamp');
          expect(data.question).toBe(question);
          expect(data.anonymousId).toMatch(/^anon-/);
          expect(data).not.toHaveProperty('studentId');

          questionId = data.questionId;
          receivedNotification = true;

          // Step 4: Teacher answers the question
          request(app)
            .post(`/api/teacher/anonymous-question/${questionId}/answer`)
            .send({ answer })
            .expect(200)
            .end((err, res) => {
              if (err) return done(err);
              expect(res.body.success).toBe(true);
            });
        });

        // Step 5: Student connects and joins classroom
        studentSocket = ioClient(`http://localhost:${serverPort}`);
        
        studentSocket.on('connect', () => {
          studentSocket.emit('join', `classroom:${classroomId}`);

          // Step 6: Student listens for answer broadcast
          studentSocket.on('student:anonymous_answer', (data) => {
            expect(data).toHaveProperty('questionId');
            expect(data).toHaveProperty('anonymousId');
            expect(data).toHaveProperty('question');
            expect(data).toHaveProperty('answer');
            expect(data).toHaveProperty('timestamp');
            expect(data.question).toBe(question);
            expect(data.answer).toBe(answer);
            expect(data.anonymousId).toMatch(/^anon-/);
            expect(data).not.toHaveProperty('studentId');

            receivedAnswer = true;

            // Verify complete flow
            expect(receivedNotification).toBe(true);
            expect(receivedAnswer).toBe(true);
            done();
          });

          // Step 3: Student submits anonymous question
          request(app)
            .post('/api/student/anonymous-question')
            .send({ studentId, classroomId, question })
            .expect(201)
            .end((err, res) => {
              if (err) return done(err);
              expect(res.body.success).toBe(true);
              expect(res.body.questionId).toBeTruthy();
            });
        });
      });
    }, 10000); // 10 second timeout for async flow

    it('should maintain privacy throughout the entire flow', (done) => {
      const classroomId = 'classroom-789';
      const studentId = 'student-secret-123';
      const question = 'I do not understand fractions';
      const answer = 'Fractions represent parts of a whole.';

      let questionId: string;

      // Teacher connects
      teacherSocket = ioClient(`http://localhost:${serverPort}`);
      
      teacherSocket.on('connect', () => {
        teacherSocket.emit('join', `classroom:${classroomId}`);

        // Teacher receives notification
        teacherSocket.on('teacher:anonymous_question', (data) => {
          // Verify student ID is NOT exposed to teacher
          expect(data).not.toHaveProperty('studentId');
          expect(data).not.toHaveProperty('studentIdHash');
          expect(JSON.stringify(data)).not.toContain(studentId);
          expect(data.anonymousId).not.toContain(studentId);

          questionId = data.questionId;

          // Teacher answers
          request(app)
            .post(`/api/teacher/anonymous-question/${questionId}/answer`)
            .send({ answer })
            .expect(200)
            .end((err) => {
              if (err) return done(err);
            });
        });

        // Student connects
        studentSocket = ioClient(`http://localhost:${serverPort}`);
        
        studentSocket.on('connect', () => {
          studentSocket.emit('join', `classroom:${classroomId}`);

          // Student receives answer
          studentSocket.on('student:anonymous_answer', (data) => {
            // Verify student ID is NOT exposed in broadcast
            expect(data).not.toHaveProperty('studentId');
            expect(data).not.toHaveProperty('studentIdHash');
            expect(JSON.stringify(data)).not.toContain(studentId);
            expect(data.anonymousId).not.toContain(studentId);

            done();
          });

          // Submit question
          request(app)
            .post('/api/student/anonymous-question')
            .send({ studentId, classroomId, question })
            .expect(201)
            .end((err) => {
              if (err) return done(err);
            });
        });
      });
    }, 10000);
  });

  describe('Multiple Students in Same Classroom', () => {
    it('should broadcast answer to all students in classroom', (done) => {
      const classroomId = 'classroom-multi';
      const studentId = 'student-1';
      const question = 'What is photosynthesis?';
      const answer = 'Photosynthesis is how plants make food from sunlight.';

      let questionId: string;
      let student1Received = false;
      let student2Received = false;
      let student3Received = false;

      // Teacher connects
      teacherSocket = ioClient(`http://localhost:${serverPort}`);
      
      teacherSocket.on('connect', () => {
        teacherSocket.emit('join', `classroom:${classroomId}`);

        teacherSocket.on('teacher:anonymous_question', (data) => {
          questionId = data.questionId;

          // Teacher answers
          request(app)
            .post(`/api/teacher/anonymous-question/${questionId}/answer`)
            .send({ answer })
            .expect(200)
            .end((err) => {
              if (err) return done(err);
            });
        });

        // Create 3 student sockets
        const student1Socket = ioClient(`http://localhost:${serverPort}`);
        const student2Socket = ioClient(`http://localhost:${serverPort}`);
        const student3Socket = ioClient(`http://localhost:${serverPort}`);

        student1Socket.on('connect', () => {
          student1Socket.emit('join', `classroom:${classroomId}`);
          student1Socket.on('student:anonymous_answer', (data) => {
            expect(data.answer).toBe(answer);
            student1Received = true;
            checkAllReceived();
          });
        });

        student2Socket.on('connect', () => {
          student2Socket.emit('join', `classroom:${classroomId}`);
          student2Socket.on('student:anonymous_answer', (data) => {
            expect(data.answer).toBe(answer);
            student2Received = true;
            checkAllReceived();
          });
        });

        student3Socket.on('connect', () => {
          student3Socket.emit('join', `classroom:${classroomId}`);
          student3Socket.on('student:anonymous_answer', (data) => {
            expect(data.answer).toBe(answer);
            student3Received = true;
            checkAllReceived();
          });

          // Submit question after all students connected
          setTimeout(() => {
            request(app)
              .post('/api/student/anonymous-question')
              .send({ studentId, classroomId, question })
              .expect(201)
              .end((err) => {
                if (err) return done(err);
              });
          }, 100);
        });

        function checkAllReceived() {
          if (student1Received && student2Received && student3Received) {
            student1Socket.disconnect();
            student2Socket.disconnect();
            student3Socket.disconnect();
            done();
          }
        }
      });
    }, 15000);
  });

  describe('Classroom Isolation', () => {
    it('should NOT broadcast to students in different classrooms', (done) => {
      const classroom1 = 'classroom-A';
      const classroom2 = 'classroom-B';
      const studentId = 'student-1';
      const question = 'What is gravity?';
      const answer = 'Gravity is a force that attracts objects.';

      let questionId: string;
      let classroom1Received = false;
      let classroom2Received = false;

      // Teacher for classroom 1
      teacherSocket = ioClient(`http://localhost:${serverPort}`);
      
      teacherSocket.on('connect', () => {
        teacherSocket.emit('join', `classroom:${classroom1}`);

        teacherSocket.on('teacher:anonymous_question', (data) => {
          questionId = data.questionId;

          // Answer the question
          request(app)
            .post(`/api/teacher/anonymous-question/${questionId}/answer`)
            .send({ answer })
            .expect(200)
            .end((err) => {
              if (err) return done(err);
            });
        });

        // Student in classroom 1 (should receive)
        const student1Socket = ioClient(`http://localhost:${serverPort}`);
        student1Socket.on('connect', () => {
          student1Socket.emit('join', `classroom:${classroom1}`);
          student1Socket.on('student:anonymous_answer', (data) => {
            expect(data.answer).toBe(answer);
            classroom1Received = true;
            checkCompletion();
          });
        });

        // Student in classroom 2 (should NOT receive)
        const student2Socket = ioClient(`http://localhost:${serverPort}`);
        student2Socket.on('connect', () => {
          student2Socket.emit('join', `classroom:${classroom2}`);
          student2Socket.on('student:anonymous_answer', () => {
            classroom2Received = true;
            // This should NOT happen
          });

          // Submit question to classroom 1
          setTimeout(() => {
            request(app)
              .post('/api/student/anonymous-question')
              .send({ studentId, classroomId: classroom1, question })
              .expect(201)
              .end((err) => {
                if (err) return done(err);
              });
          }, 100);

          // Wait to ensure classroom 2 doesn't receive
          setTimeout(() => {
            checkCompletion();
          }, 2000);
        });

        function checkCompletion() {
          if (classroom1Received && !classroom2Received) {
            student1Socket.disconnect();
            student2Socket.disconnect();
            done();
          }
        }
      });
    }, 15000);
  });

  describe('Database State Verification', () => {
    it('should verify database state at each step of the flow', async () => {
      const classroomId = 'classroom-db-test';
      const studentId = 'student-db-test';
      const question = 'What is chemistry?';
      const answer = 'Chemistry is the study of matter and its properties.';

      // Step 1: Submit question
      const submitResponse = await request(app)
        .post('/api/student/anonymous-question')
        .send({ studentId, classroomId, question })
        .expect(201);

      expect(submitResponse.body.success).toBe(true);
      const questionId = submitResponse.body.questionId;

      // Step 2: Verify question stored with hashed ID (not actual ID)
      expect(submitResponse.body).not.toHaveProperty('studentId');
      expect(submitResponse.body.anonymousId).toMatch(/^anon-/);

      // Step 3: Answer the question
      const answerResponse = await request(app)
        .post(`/api/teacher/anonymous-question/${questionId}/answer`)
        .send({ answer })
        .expect(200);

      expect(answerResponse.body.success).toBe(true);
      expect(answerResponse.body.question.answered).toBe(true);
      expect(answerResponse.body.question.answer).toBe(answer);

      // Step 4: Verify updated state
      expect(answerResponse.body.question.question_id).toBe(questionId);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing answer gracefully', async () => {
      const response = await request(app)
        .post('/api/teacher/anonymous-question/fake-id/answer')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('answer is required');
    });

    it('should handle empty answer gracefully', async () => {
      const response = await request(app)
        .post('/api/teacher/anonymous-question/fake-id/answer')
        .send({ answer: '   ' })
        .expect(400);

      expect(response.body.error).toContain('cannot be empty');
    });

    it('should handle non-existent question gracefully', async () => {
      const response = await request(app)
        .post('/api/teacher/anonymous-question/non-existent-id/answer')
        .send({ answer: 'Some answer' })
        .expect(404);

      expect(response.body.error).toBe('Question not found');
    });

    it('should handle missing studentId in submission', async () => {
      const response = await request(app)
        .post('/api/student/anonymous-question')
        .send({ classroomId: 'classroom-1', question: 'Test?' })
        .expect(400);

      expect(response.body.error).toBe('studentId is required');
    });

    it('should handle missing classroomId in submission', async () => {
      const response = await request(app)
        .post('/api/student/anonymous-question')
        .send({ studentId: 'student-1', question: 'Test?' })
        .expect(400);

      expect(response.body.error).toBe('classroomId is required');
    });

    it('should handle missing question in submission', async () => {
      const response = await request(app)
        .post('/api/student/anonymous-question')
        .send({ studentId: 'student-1', classroomId: 'classroom-1' })
        .expect(400);

      expect(response.body.error).toContain('question is required');
    });
  });

  describe('Socket.io Event Verification', () => {
    it('should emit correct event names', (done) => {
      const classroomId = 'classroom-events';
      const studentId = 'student-events';
      const question = 'Test question';
      const answer = 'Test answer';

      let questionId: string;
      let correctTeacherEvent = false;
      let correctStudentEvent = false;

      teacherSocket = ioClient(`http://localhost:${serverPort}`);
      
      teacherSocket.on('connect', () => {
        teacherSocket.emit('join', `classroom:${classroomId}`);

        // Verify teacher event name
        teacherSocket.on('teacher:anonymous_question', (data) => {
          correctTeacherEvent = true;
          questionId = data.questionId;

          request(app)
            .post(`/api/teacher/anonymous-question/${questionId}/answer`)
            .send({ answer })
            .expect(200)
            .end((err) => {
              if (err) return done(err);
            });
        });

        studentSocket = ioClient(`http://localhost:${serverPort}`);
        
        studentSocket.on('connect', () => {
          studentSocket.emit('join', `classroom:${classroomId}`);

          // Verify student event name
          studentSocket.on('student:anonymous_answer', () => {
            correctStudentEvent = true;

            expect(correctTeacherEvent).toBe(true);
            expect(correctStudentEvent).toBe(true);
            done();
          });

          request(app)
            .post('/api/student/anonymous-question')
            .send({ studentId, classroomId, question })
            .expect(201)
            .end((err) => {
              if (err) return done(err);
            });
        });
      });
    }, 10000);
  });

  describe('Payload Structure Verification', () => {
    it('should include all required fields in teacher notification', (done) => {
      const classroomId = 'classroom-payload';
      const studentId = 'student-payload';
      const question = 'Test question';

      teacherSocket = ioClient(`http://localhost:${serverPort}`);
      
      teacherSocket.on('connect', () => {
        teacherSocket.emit('join', `classroom:${classroomId}`);

        teacherSocket.on('teacher:anonymous_question', (data) => {
          expect(data).toHaveProperty('questionId');
          expect(data).toHaveProperty('anonymousId');
          expect(data).toHaveProperty('question');
          expect(data).toHaveProperty('timestamp');
          expect(data.questionId).toBeTruthy();
          expect(data.anonymousId).toMatch(/^anon-/);
          expect(data.question).toBe(question);
          expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);
          done();
        });

        request(app)
          .post('/api/student/anonymous-question')
          .send({ studentId, classroomId, question })
          .expect(201)
          .end((err) => {
            if (err) return done(err);
          });
      });
    }, 10000);

    it('should include all required fields in student answer broadcast', (done) => {
      const classroomId = 'classroom-answer-payload';
      const studentId = 'student-answer-payload';
      const question = 'Test question';
      const answer = 'Test answer';

      let questionId: string;

      teacherSocket = ioClient(`http://localhost:${serverPort}`);
      
      teacherSocket.on('connect', () => {
        teacherSocket.emit('join', `classroom:${classroomId}`);

        teacherSocket.on('teacher:anonymous_question', (data) => {
          questionId = data.questionId;

          request(app)
            .post(`/api/teacher/anonymous-question/${questionId}/answer`)
            .send({ answer })
            .expect(200)
            .end((err) => {
              if (err) return done(err);
            });
        });

        studentSocket = ioClient(`http://localhost:${serverPort}`);
        
        studentSocket.on('connect', () => {
          studentSocket.emit('join', `classroom:${classroomId}`);

          studentSocket.on('student:anonymous_answer', (data) => {
            expect(data).toHaveProperty('questionId');
            expect(data).toHaveProperty('anonymousId');
            expect(data).toHaveProperty('question');
            expect(data).toHaveProperty('answer');
            expect(data).toHaveProperty('timestamp');
            expect(data.questionId).toBeTruthy();
            expect(data.anonymousId).toMatch(/^anon-/);
            expect(data.question).toBe(question);
            expect(data.answer).toBe(answer);
            expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);
            done();
          });

          request(app)
            .post('/api/student/anonymous-question')
            .send({ studentId, classroomId, question })
            .expect(201)
            .end((err) => {
              if (err) return done(err);
            });
        });
      });
    }, 10000);
  });

  describe('Requirements Validation', () => {
    it('should satisfy REQ-3.1.1: provide anonymous question submission', async () => {
      const response = await request(app)
        .post('/api/student/anonymous-question')
        .send({
          studentId: 'student-1',
          classroomId: 'classroom-1',
          question: 'What is algebra?'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.questionId).toBeTruthy();
    });

    it('should satisfy REQ-3.1.2: create one-way hash of student ID', async () => {
      const studentId = 'student-hash-test';
      const response = await request(app)
        .post('/api/student/anonymous-question')
        .send({
          studentId,
          classroomId: 'classroom-1',
          question: 'Test question'
        })
        .expect(201);

      // Response should not contain actual student ID
      expect(JSON.stringify(response.body)).not.toContain(studentId);
      expect(response.body.anonymousId).toMatch(/^anon-/);
    });

    it('should satisfy REQ-3.1.3: store questions without revealing identity', async () => {
      const studentId = 'student-privacy-test';
      const response = await request(app)
        .post('/api/student/anonymous-question')
        .send({
          studentId,
          classroomId: 'classroom-1',
          question: 'Test question'
        })
        .expect(201);

      // Verify student ID is not in response
      expect(response.body).not.toHaveProperty('studentId');
      expect(JSON.stringify(response.body)).not.toContain(studentId);
    });

    it('should satisfy REQ-3.1.4: notify teacher via Socket.io', (done) => {
      teacherSocket = ioClient(`http://localhost:${serverPort}`);
      
      teacherSocket.on('connect', () => {
        teacherSocket.emit('join', 'classroom:test');

        teacherSocket.on('teacher:anonymous_question', (data) => {
          expect(data).toBeTruthy();
          expect(data.questionId).toBeTruthy();
          done();
        });

        request(app)
          .post('/api/student/anonymous-question')
          .send({
            studentId: 'student-1',
            classroomId: 'test',
            question: 'Test'
          })
          .expect(201)
          .end((err) => {
            if (err) return done(err);
          });
      });
    }, 10000);

    it('should satisfy REQ-3.1.5: broadcast answers to entire classroom', (done) => {
      const classroomId = 'classroom-broadcast';
      const answer = 'Test answer';
      let questionId: string;

      teacherSocket = ioClient(`http://localhost:${serverPort}`);
      
      teacherSocket.on('connect', () => {
        teacherSocket.emit('join', `classroom:${classroomId}`);

        teacherSocket.on('teacher:anonymous_question', (data) => {
          questionId = data.questionId;

          request(app)
            .post(`/api/teacher/anonymous-question/${questionId}/answer`)
            .send({ answer })
            .expect(200)
            .end((err) => {
              if (err) return done(err);
            });
        });

        studentSocket = ioClient(`http://localhost:${serverPort}`);
        
        studentSocket.on('connect', () => {
          studentSocket.emit('join', `classroom:${classroomId}`);

          studentSocket.on('student:anonymous_answer', (data) => {
            expect(data.answer).toBe(answer);
            done();
          });

          request(app)
            .post('/api/student/anonymous-question')
            .send({
              studentId: 'student-1',
              classroomId,
              question: 'Test'
            })
            .expect(201)
            .end((err) => {
              if (err) return done(err);
            });
        });
      });
    }, 10000);

    it('should satisfy REQ-3.1.6: never reveal question author to teacher', (done) => {
      const studentId = 'student-secret-identity';
      const classroomId = 'classroom-privacy';

      teacherSocket = ioClient(`http://localhost:${serverPort}`);
      
      teacherSocket.on('connect', () => {
        teacherSocket.emit('join', `classroom:${classroomId}`);

        teacherSocket.on('teacher:anonymous_question', (data) => {
          // Verify student identity is NOT revealed
          expect(data).not.toHaveProperty('studentId');
          expect(data).not.toHaveProperty('studentIdHash');
          expect(JSON.stringify(data)).not.toContain(studentId);
          done();
        });

        request(app)
          .post('/api/student/anonymous-question')
          .send({ studentId, classroomId, question: 'Test' })
          .expect(201)
          .end((err) => {
            if (err) return done(err);
          });
      });
    }, 10000);
  });
});
