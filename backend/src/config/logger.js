module.exports = function log(msg) {
  console.log(`[LOG ${new Date().toISOString()}]`, msg);
};
