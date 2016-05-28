Router.route('/export/:type/:table', function() {

  var url = '/rest/v1/export/' + this.params.type + '/' + this.params.table;

  var options = {
    host: 'xxx.xxx.xxx.xxx',
    port: '8443',
    path: url,
    method: 'GET',
    headers: {
      'Accept': 'application/octet-stream',
      'Authorization': "Basic " + new Buffer("xxxx:xxxx").toString("base64")
    },
    rejectUnauthorized: false
  };

  var raw = '';
  var http = Meteor.npmRequire('https');
  var iconv = Meteor.npmRequire('iconv-lite');
  var Readable = Npm.require('stream').Readable;
  var response = this.response;

  var req = http.request(options, function(res) {
    res.on('data', function(data) {});
    res.on('end', function() {
      var raws = raw.split('\r\n');
      var size = raws.length;
      for (var i = 0; i < size; i++) {
        var line = raws.shift();
        if (line === '') {
          break;
        }
      }
      raw = raws.join('\r\n');

      var rs = new Readable;
      rs.push(iconv.encode(raw, 'ISO-8859-1'));
      rs.push(null);
      rs.on('error', function(error) {
        console.log(error);
      });
    
      response.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': res.headers['content-disposition'],
        'Vary': 'Accept-Encoding',
        'Content-Length': raw.length
      });
      rs.pipe(response);
    });
  });
  req.on('socket', function(socket) {
    socket.resume();
    var ondata = socket.ondata;
    socket.ondata = function(buf, start, end) {
      raw += iconv.decode(buf.slice(start, end), 'ISO-8859-1');
      ondata.call(socket, buf, start, end);
    }
  });
  req.end();

}, {where: 'server'});
