const generatePatientId = () => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PAT-${timestamp}-${randomPart}`;
};

module.exports = { generatePatientId };



