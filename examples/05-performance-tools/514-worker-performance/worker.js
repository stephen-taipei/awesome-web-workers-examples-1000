self.onmessage = function(e) {
    // Echo back immediately
    self.postMessage(e.data);
};
