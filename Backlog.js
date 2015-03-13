var levelup = require('level');

function Backlog(dbname) {
	this.db = levelup(dbname);
	// other than these properties,
	// this object is a dict of canary messages
}

Backlog.prototype.contains = backlogContains;
Backlog.prototype.values = backlogValues;
Backlog.prototype.keys = backlogKeys;
Backlog.prototype.close = backlogClose;
Backlog.prototype.add = backlogAdd;
Backlog.prototype.getAll = backlogGetAll;
Backlog.prototype.getLatest = backlogGetLatest;

function backlogKeys() {
	return this.db.createKeyStream();
}
function backlogValues() {
	return this.db.createValueStream();
}
// cb(err, bool contains)
function backlogContains(message, cb) {
	var contains = false;
	this.values().
		on('data', function(data) {
			if(data === message)
				contains = true;
		}).on('error', function(err) {
			cb(err);
		}).on('end', function() {
			cb(null, contains);
		});
}
// cb(err, int time)
function backlogAdd(entry, cb) {
	var now = Date.now();
	var self = this;
	this.db.get(now, function(err, val) {
		if(err.notFound)
			return self.db.put(now, entry, function(err) {
				if(err)
					return cb(err);

				cb(null, now);
			});

		if(err)
			return cb(err);

		if(val)
			return cb(new Error("Temporal anomaly."));

		cb(new Error("Edge case in Backlog.add"));
	});
}
// cb(err, Array array)
function backlogGetAll(cb) {
	var array = [];
	this.db.createReadStream().
		on('data', function(data) {
			array.push(data);
		}).on('error', function(err) {
			cb(err);
		}).on('end', function() {
			cb(null, array);
		});
}
// cb(err, int time, String result)
function backlogGetLatest(cb) {
	var result = 0;
	var self = this;
	this.keys().
		on('data', function(data) {
			var num = parseInt(data);

			if(num > result)
				result = num;
		}).on('error', function(err) {
			cb(err);
		}).on('end', function() {
			if(result > 0)
				self.db.get(result, function(err, value) {
					if(err)
						return cb(err);

					cb(null, result, value);
				});
		});
}

function backlogClose(cb) {
	this.db.close(cb);
}

module.exports = Backlog;
