let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function getIO() {
  return ioInstance;
}

function emit(event, payload) {
  if (ioInstance) ioInstance.emit(event, payload);
}

module.exports = { setIO, getIO, emit };
