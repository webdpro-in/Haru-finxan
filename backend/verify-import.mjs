import * as mod from './src/services/PredictiveFailureDetection.ts';

console.log('Module keys:', Object.keys(mod));
console.log('calculateRiskScore:', typeof mod.calculateRiskScore);

if (typeof mod.calculateRiskScore === 'function') {
  console.log('SUCCESS: Function is exported correctly');
} else {
  console.log('FAIL: Function is not exported');
}
