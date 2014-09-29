#Node.js Warrant Canary module

A node module that implements a warrant canary. Inbound messages are checked for a valid signature, then, if not already accounted for, included in the collection of canary messages.

This module requires a (separate) GPG keyring loaded with only the verifying public key. You will be feeding the path to the keyring to the constructor as the second argument. It also needs a file to store JSON in to keep state.

###Create the keyring

`gpg -a --export MyKeyName | gpg --no-default-keyring --keyring ./CanaryKeyring --import`

###Preparations

Now, for the canary to be useful, **you must securely store ONE and ONLY ONE copy of the signing key, and be prepared to PERMANENTLY delete it on a moment's notice.** Add signed messages to the canary frequently enough that the key's deletion would be noticed relatively quickly. 

##API

####Canary(db, pkring)

The constructor takes two arguments:

*`db`: the path to the file where it will store a backlog of canary messages.
*`pkring`: the path to the public keyring containing __ONLY__ the verifying key.

It returns a Canary object.

####Canary.getLatest()

Returns the latest canary message in the Backlog.

####Canary.feedString(msg, callback)

This function takes a string argument, `msg`, to be verified and (hopefully) added to the backlog.

Give it a one-argument callback, e.g., `function(err) { complainAbout(err); }`.

Writes are immediately synced to disk.

####Canary.feedStream(stream, callback)

This function takes a stream argument, `stream`, to be verified and (hopefully) added to the Backlog of canary messages.

As above, it takes a one-argument callback for error reporting.

Writes are immediately synced to disk.

