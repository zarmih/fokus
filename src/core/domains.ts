export const domains = ['attention', 'memory', 'speed', 'flexibility', 'logic'];
export const calculateEMA = (current: number, newValue: number, alpha: number = 0.3) => {
  return current + alpha * (newValue - current);
};
