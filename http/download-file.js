/************************************************************
 *
 * Server side router to download exporting file
 *
 * Export the files from restful interface by Java
 * and return the file stream back to meteor client
 * directly
 *
 * Using https and basic authentication to send the
 * message to Java restful interface
 *
 * The file stream may be encoded by ISO-8859-1, and
 * the http package in node v0.10 is decoded the
 * response body by utf8 by default, so the script
 * just gets the raw bytes and decoded by Iconv using
 * ISO-8859-1 and then remove the header in the raw
 * bytes. Last, set the raw bytes without header back
 * to client
 *
 * Client will download the file automatically by using
 * 'Content-Type': 'application/octet-stream' and also
 * 'Content-Disposition': 'attachment; filename="test.pdf"'
 *
************************************************************/
Router.route('/export/:type/:table', function() {

  var url = '/rest/v1/export/' + this.params.type + '/' + this.params.table;

  // using basic authentication
  var options = {
    host: 'xxx.xxx.xxx.xxx',
    port: '8443',
    path: url,
    method: 'GET',
    headers: {
      'Accept': 'application/octet-stream',
      'Authorization': "Basic " + new Buffer("xxxx:xxxx").toString("base64")
    },
    // don't check the server certification
    // if you using cert and key for ssl,
    // please see https://nodejs.org/api/https.html
    //  * pfx: Certificate, Private key and CA certificates to use for SSL. Default null
    //  * key: Private key to use for SSL. Default null
    //  * cert: Public x509 certificate to use. Default null
    rejectUnauthorized: false
  };

  var raw = '';
  // if using http, Meteor.npmRequire('http') 
  var http = Meteor.npmRequire('https');
  // for ISO-8859-1 decoding
  var iconv = Meteor.npmRequire('iconv-lite');
  // using stream to send back the file stream
  var Readable = Npm.require('stream').Readable;
  var response = this.response;

  var req = http.request(options, function(res) {
    // handle data
    res.on('data', function(data) {});
    res.on('end', function() {
      // handle the raw http string which
      // encoded by ISO-8859-1
      var raws = raw.split('\r\n');
      var size = raws.length;
      // remove the header part
      for (var i = 0; i < size; i++) {
        var line = raws.shift();
        if (line === '') {
          break;
        }
      }
      raw = raws.join('\r\n');

      var rs = new Readable;
      // convert the file stream to bytes array by ISO-8859-1
      rs.push(iconv.encode(raw, 'ISO-8859-1'));
      rs.push(null);
      rs.on('error', function(error) {
        console.log(error);
      });
    
      // write the response header
      // content type is 'application/octet-stream'
      // get the content disposition from response
      // header
      response.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': res.headers['content-disposition'],
        'Vary': 'Accept-Encoding',
        'Content-Length': raw.length
      });
      // send to client
      rs.pipe(response);
    });
  });
  // handle socket
  req.on('socket', function(socket) {
    socket.resume();
    var ondata = socket.ondata;
    socket.ondata = function(buf, start, end) {
      // read the raw data and encoded by ISO-8859-1
      raw += iconv.decode(buf.slice(start, end), 'ISO-8859-1');
      ondata.call(socket, buf, start, end);
    }
  });
  // send request
  req.end();

}, {where: 'server'});
