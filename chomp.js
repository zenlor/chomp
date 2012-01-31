var fs = require('fs')
  , FastList = require('fast-list');

var Chomp = module.exports = function () {
  this.list = new FastList();
};

Chomp.prototype.push = function (chunk, cb) {
  var self = this;
  fs.stat(chunk, function (err) {
    if (err) cb(err);

    // reverse ordering to use pop in write()
    self.list.unshift(chunk);
    if (cb) cb.call();
  });
};

Chomp.prototype.write = function (dest, every_callback, finally_callback) {
  var self = this;

  fs.stat(dest, function (err, stats) {
    if (!err) {
      try {
        fs.unlinkSync(dest);
      } catch(e) {
        // I don't care right now
      }
    };

    self._write(dest, every_callback, finally_callback);
  });
};

Chomp.prototype._write = function (dest, every_callback, finally_callback) {
  var list = this.list
    , ws = fs.createWriteStream(dest, {
        flags: 'a+'
      });

  function write (rs) {
    var stream = fs.createReadStream(rs)
      , err = 0;

    stream.pipe(ws, {end: false})

    stream.on('error', function (error) {
      stream.destroy();
      ws.destroy();

      if (every_callback)
        every_callback(error);
      if (finally_callback)
        finally_callback(error);
    });

    stream.on("end", function() {
      var next = list.pop()

      if (every_callback) every_callback(null, rs);

      if (next) {
        write(next, ws);
      } else {
        finally_callback(null, dest);
      }
    });
  }
  
  // start the queue popping the first element
  write(list.pop())

  return this.list;
};