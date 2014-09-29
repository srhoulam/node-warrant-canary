var fs = require('fs');

function Backlog(file, callback) {
	this.path = file;
	this.initialized = false;
	// other than these properties,
	// this object is a dict of canary messages
	this.init(callback);
}

Backlog.prototype._load = backlog_load;
Backlog.prototype.contains = backlogContains;
Backlog.prototype.save = backlogSave;
Backlog.prototype.init = backlogInit;
Backlog.prototype.add = backlogAdd;
Backlog.prototype.create = backlogCreate;
Backlog.prototype.toString = backlogToString;
Backlog.prototype.getMessageArray = backlogGetMessageArray;

function backlogGetMessageArray() {
	var result = [];
	for(var i in this)
		if(parseInt(i)) // this will exclude the `path` and `initialized` attributes
			result.push(this[i]);

	return result;
}
function backlogToString() {
	return JSON.stringify(this);
}
function backlog_load(obj) {
	for(var i in obj)
		if(!(i in this))
			this[i] = obj[i];
}
function backlogContains(entry) {
	for(var i in this) {
		if(this[i] == entry) return i;
	}
	return false;
}
function backlogAdd(entry) {
	var now = Date.now();
	if(this[now]) throw {'name':'BacklogPostDatedEntry', 'message':"Backlog entry exists for current time. Check system clock or db file integrity."};

	this['latest'] = this[now] = entry;
	this.save();
}
function backlogCreate() {
	fs.writeFileSync(this.path, '', {'mode':0644});
	this.initialized = true;
}
function backlogInit() {
	try {
		var fileData = fs.readFileSync(this.path);
		this._load(JSON.parse(fileData));
		this.initialized = true;
	} catch(e) {
		this.create();
	}
}
function backlogSave() {
	try {
		fs.writeFileSync(this.path, this.toString(), {'mode':0644});
	} catch(e) {
		console.error("Backlog NOT saved, exception thrown on file write.");
		console.error(e.name, e.message);
		console.log("Dumping unsaved Backlog object:");
		console.log(this.toString());
	}
}

module.exports = Backlog;
