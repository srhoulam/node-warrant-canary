var	path = require('path'),
	cproc = require('child_process'),
	Backlog = require('./Backlog'),
	StreamReader = require('./StreamReader');

function Canary(db, pkring) {
	/**
	 * db: file argument for Backlog constructor
	 * pkring: keyring file where the signer's public key is stored. empty string for default
	 */
	this.messages = new Backlog(db);
	this.keyring = pkring ? path.resolve(pkring) : './default_keyring';
	this.initialized = this.messages.initialized ? true : false;
}

Canary.prototype.getLatest = canaryGetLatest;
Canary.prototype.isGood = canaryIsGood;
Canary.prototype.feedString = canaryAdd;
Canary.prototype.feedStream = canaryFeed;
Canary.prototype._add = canary_add;

function canaryIsGood() {
	if(this.keyring && this.initialized) return true;
	else return false;
}
function canaryGetLatest() {
	return this.messages.latest;
}
function canaryAdd(msg, callback) {
	if(!this.isGood()) throw {'name':'CanaryNotGood','message':"Canary initialization failed"};

	var result = [];
	var stream = new StreamReader(msg);
	// gpg --no-default-keyring --keyring this.keyring --trust-model always --verify
	var gpgval = cproc.spawn('gpg',
		['--no-default-keyring',
			'--keyring', path.resolve(this.keyring),
			'--trust-model', 'always',
			'--verify']
	);
	gpgval.on('error', callback);
	// read stderr for "Good signature"
	gpgval.stderr.setEncoding('utf8');
	gpgval.stderr.on('data', function(chunk) { result.push(chunk); });
	gpgval.stderr.on('end', function() {
		var res = result.join('');
		if(res.indexOf('Good signature') > -1) this._add(msg, callback);
		else callback({'name':'GPGBadSignature','message':res});
	}.bind(this));
	gpgval.on('exit', function(code, signal) {
		if(code != 0) callback({'name' : 'GPGVerifyError', 'message' : 'Nonzero exit status. Code: ' + code});
	});

	// write message stream to gpg's stdin and close stream
	stream.on('data', function(chunk) {
		gpgval.stdin.write(chunk);
	});
	stream.on('end', function() {
		gpgval.stdin.end();
	});
	stream.resume();
}
function canaryFeed(stream, callback) {
	if(!this.isGood()) throw {'name':'CanaryNotGood','message':"Canary initialization failed"};

	var result = [];
	var msg = '';
	// gpg --no-default-keyring --keyring this.keyring --trust-model always --verify
	var gpgval = cproc.spawn('gpg',
		['--no-default-keyring',
			'--keyring', path.resolve(this.keyring),
			'--trust-model', 'always',
			'--verify']
	);
	gpgval.on('error', callback);
	// read stderr for "Good signature"
	gpgval.stderr.setEncoding('utf8');
	gpgval.stderr.on('data', function(chunk) { result.push(chunk); });
	gpgval.stderr.on('end', function() {
		var res = result.join('');
		if(res.indexOf('Good signature') > -1) this._add(msg, callback);
		else callback({'name':'GPGBadSignature','message':res});
	}.bind(this));
	gpgval.on('exit', function(code, signal) {
		if(code != 0) callback({'name' : 'GPGVerifyError', 'message' : 'Nonzero exit status. Code: ' + code});
	});

	// write message stream to gpg's stdin and close stream
	stream.on('data', function(chunk) {
		gpgval.stdin.write(chunk);
		msg += chunk;
	});
	stream.on('end', function() {
		gpgval.stdin.end();
	});
}
function canary_add(msg, callback) {
	if(!this.messages.contains(msg)) this.messages.add(msg);
	else callback({'name':'CanaryReplayMsg', 'message':"Message not added: message is a replay."});
}
module.exports = Canary;
