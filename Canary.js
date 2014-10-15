var	path = require('path'),
	cproc = require('child_process'),
	crypto = require('crypto'),
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

Canary.prototype.getKey = canaryGetKey;
Canary.prototype.getLatest = canaryGetLatest;
Canary.prototype.getLatestHash = canaryGetLatestHash;
Canary.prototype.getBacklogHash = canaryGetBacklogHash;
Canary.prototype.isGood = canaryIsGood;
Canary.prototype.feedString = canaryAdd;
Canary.prototype.feedStream = canaryFeed;
Canary.prototype._add = canary_add;

function canaryIsGood() {
	if(this.keyring && this.initialized) return true;
	else return false;
}
function canaryGetKey(callback) {
	var result = '';
	var gpgexp = cproc.spawn('gpg',
		['--no-default-keyring',
			'--keyring', path.resolve(this.keyring),
			'-a', '--export']
	);
	gpgexp.on('error', function(err) { callback(null, err); });
	gpgexp.stdout.on('data', function(chunk) { result += chunk; });
	gpgexp.stdout.on('end', function() { callback(result, null); });
	gpgexp.on('exit', function(code, signal) {
		if(code != 0) callback(null, {'name':'GPGExportError', 'message':'Nonzero exit status. Code: ' + code});
	});
}
function canaryGetLatest() {
	return this.messages.latest;
}
function canaryGetLatestHash(alg, enc) { // arguments are optional; defaults: sha256, hex
	var sha = crypto.createHash(alg ? alg :"sha256");
	sha.update(this.getLatest());
	return sha.digest(enc ? enc : 'hex');
}
function canaryGetBacklogHash(alg, enc) {
	var messages = this.messages.getMessageArray(),
		sha = crypto.createHash(alg ? alg : "sha256");
	
	for(var i = 0; i < messages.length; i++)
		sha.update(messages[i]);
	
	return sha.digest(enc ? enc : 'hex');
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
