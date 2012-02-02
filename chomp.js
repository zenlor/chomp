//     chomp 0.0.1 alpha 2
//     (c) 2012 Lorenzo Giuliani
//     Released under MIT license.

var fs = require('fs')
  , FastList = require('fast-list')
  , isFunction = function(obj) {
      return Object.prototype.toString.call(obj) == '[object Function]';
    }
  , debug = false
  , dd = function() {
      if (debug)
        console.log.apply(arguments.callee, arguments);
    };


/**
 * Base Object
 * @param  {Boolean} debug    enables debug logs
 * @return {[type]}
 */
var Chomp = module.exports = function (debug) {
  this.list = new FastList();
  if (debug) {
    debug = true;
  }
};

/**
 * append a new file path to the internal list
 * if the file doesn't exists will callback the
 * `Stat` error
 * @param  {String}   chunk     file path
 * @param  {Function} cb        Callback
 */
Chomp.prototype.push = function (chunk, cb) {
  var self = this;
  fs.stat(chunk, function (err) {
    if (err) cb(err);

    // reverse ordering to use pop in write()
    self.list.unshift(chunk);
    if (cb) cb.call();
  });
};

/**
 * Write the list of file chunks to the destination file
 * @param  {String}   dest        destination file. *note* path must exist
 * @param  {Function} chunk_cb    callback for every appended file
 * @param  {Function} callback    callback called at the end or on error
 */
Chomp.prototype.write = function (dest, chunk_cb, callback) {
  var self = this;

  fs.stat(dest, function (err, stats) {
    if (!err) {
      try {
        fs.unlinkSync(dest);
      } catch(e) {
        // I don't care right now
      }
    };


    // Callback preparation
    // 
    if (isFunction(chunk_cb) && !callback) {
      self.chunk_cb = dd;
      self.callback = chunk_cb;
    } else if (isFunction(chunk_cb)) {
      self.chunk_cb = chunk_cb;
    } else if (! isFunction(chunk_cb)) {
      self.chunk_cb = dd;
    } else if (isFunction(callback)) {
      self.callback = callback;
    } else {
      self.callback = dd;
    }

    self.dest = fs.createWriteStream(dest, {
      flags: 'a+'
    });

    self._write();
  });
};

/**
 * the real worker
 * 
 * @private
 */
Chomp.prototype._write = function () {
  var self = this
    , list = this.list;

  function write (rs) {
    var stream = fs.createReadStream(rs)
      , err = 0;

    stream.pipe(ws, {end: false})

    stream.on('error', function (error) {
      stream.destroy();
      ws.destroy();

      self.chunk_cb(error, rs);
      self.callback(error, rs);
    });

    stream.on("end", function() {
      var next = list.pop()

      self.chunk_cb(null, rs);

      if (next) {
        write(next, ws);
      } else {
        self.callback(null, dest);
      }
    });
  }
  
  // start the queue popping the first element
  write(list.pop())

  return this.list;
};
