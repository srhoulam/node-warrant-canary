var	path = require('path'),
	cproc = require('child_process'),
	Backlog = require('./Backlog'),
	StreamReader = require('./StreamReader');

function Canary(dbname, pkring) {
	/**
	 * dbname: file argument for Backlog constructor
	 * pkring: keyring file where the signer's public key is stored. empty string for default
	 */
	this.keyring = pkring ? path.resolve(pkring) : './default_keyring';
	this.messages = new Backlog(dbname);
}

Canary.prototype.close = canaryClose;
Canary.prototype.getKey = canaryGetKey;
Canary.prototype.getLatest = canaryGetLatest;
Canary.prototype.getAll = canaryGetAll;
Canary.prototype.feedString = canaryAdd;
Canary.prototype.feedStream = canaryFeed;
Canary.prototype._add = canary_add;

function canaryGetKey(callback) {
	var result = '';
	var gpgexp = cproc.spawn('gpg',
		['--no-default-keyring',
			'--keyring', path.resolve(this.keyring),
			'-a', '--export']
	);

	gpgexp.
		on('error', function(err) {
			callback(err);
		}).on('exit', function(code, signal) {
			if(code !== 0)
				callback(new Error('Nonzero exit status. Code: ' + code));
		});

	gpgexp.stdout.on('data', function(data) {
		result += data;
	}).on('end', function() {
		callback(null, result);
	});
}
function canaryGetLatest(callback) {
	return this.messages.getLatest(callback);
}
function canaryGetAll(callback) {
	return this.messages.getAll(callback);
}
function canaryAdd(msg, callback) {
	var result = [];
	var stream = new StreamReader(msg);
	var self = this;

	// gpg --no-default-keyring --keyring this.keyring --trust-model always --verify
	var gpgval = cproc.spawn('gpg',
		['--no-default-keyring',
			'--keyring', path.resolve(this.keyring),
			'--trust-model', 'always',
			'--verify']
	);
	gpgval.
		on('error', callback).
		on('exit', function(code, signal) {
			if(code !== 0)
				callback(new Error('Nonzero exit status. Code: ' + code));
		});
	// read stderr for "Good signature"
	gpgval.stderr.setEncoding('utf8').
		on('data', function(data) {
			result.push(data);
		}).on('end', function() {
			var res = result.join('');
			if(res.indexOf('Good signature') > -1) self._add(msg, callback);
			else callback(new Error(res));
		});


	// write message stream to gpg's stdin and close stream
	stream.on('data', function(data) {
		gpgval.stdin.write(data);
	}).on('end', function() {
		gpgval.stdin.end();
	}).resume();
}
function canaryFeed(stream, callback) {
	var result = [];
	var msg = '';
	var self = this;
	// gpg --no-default-keyring --keyring this.keyring --trust-model always --verify
	var gpgval = cproc.spawn('gpg',
		['--no-default-keyring',
			'--keyring', path.resolve(this.keyring),
			'--trust-model', 'always',
			'--verify']
	);
	gpgval.
		on('error', callback).
		on('exit', function(code, signal) {
			if(code !== 0)
				callback(new Error('Nonzero exit status. Code: ' + code));
		});
	// read stderr for "Good signature"
	gpgval.stderr.setEncoding('utf8').
		on('data', function(data) {
			result.push(data);
		}).on('end', function() {
			var res = result.join('');
			if(res.indexOf('Good signature') > -1) self._add(msg, callback);
			else callback(new Error(res));
		});

	// write message stream to gpg's stdin and close stream
	stream.on('data', function(data) {
		gpgval.stdin.write(data);
		msg += data;
	}).on('end', function() {
		gpgval.stdin.end();
	});
}
function canary_add(msg, callback) {
	var self = this;
	this.messages.contains(msg, function(err, contains) {
		if(err)
			return callback(err);

		if(contains)
			return callback(new Error("Message not added: message is a replay."));

		self.messages.add(msg, callback);
	});
}
function canaryClose(cb) {
	this.messages.close(cb);
}

module.exports = Canary;
