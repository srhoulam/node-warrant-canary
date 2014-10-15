#Node.js Warrant Canary

A node module that implements a warrant canary. Inbound messages are checked for a valid signature, then, if not already accounted for, included in the collection of canary messages.

This module requires a (separate) GPG keyring loaded with only the verifying public key. You will be feeding the path to the keyring to the constructor as the second argument. It also needs a file to store JSON in to keep state.

###Create the keyring

`gpg -a --export MyKeyName | gpg --no-default-keyring --keyring ./CanaryKeyring --import`

###Preparations and things to note

For general information on warrant canaries, visit https://www.eff.org/deeplinks/2014/04/warrant-canary-faq

This warrant canary was written under the assumption that the signing key is entirely inaccessible to it. It is the operator's responsibility to manage, store, secure, and, if necessary, destroy the signing key.

For ideal usefulness, store one copy of the signing key on a separate machine, and securely delete the key once it outlives its usefulness. Adding signed messages to the canary more frequently enables the key's deletion to be noticed more quickly by anyone watching.

The canary will not accept messages without a valid signature. That is to say that unsigned messages are messages without a valid signature. I suggest using `gpg`'s `--clearsign` flag to produce a signed message that is human-readable.

#API

###Canary(db, pkring)

The constructor takes two arguments:

* `db`: the path to the file where it will store a backlog of canary messages.
* `pkring`: the path to the public keyring containing __ONLY__ the verifying key.

It returns a Canary object.

###Canary.getKey(callback)

Retrieves the public key used to verify Canary messages and passes it to the supplied callback.

Takes a two-argument callback, e.g., `callback(key, err)`.

If successful, the PEM-encoded key will be passed as the first argument. If unsuccessful, an error object will be passed as the second argument.

###Canary.getLatest()

Returns the latest canary message in the Backlog.

###Canary.getLatestHash(alg, enc)

Arguments `alg`, `enc` are optional; defaults to ('sha256', 'hex').

Returns the `alg` digest of the latest message in `enc` encoding.

This and the following method may be useful if you want to include previous message digests in the current message.

###Canary.getBacklogHash(alg, enc)

Arguments `alg`, `enc` are optional; defaults to ('sha256', 'hex').

Returns the `alg` digest of the concatenation of all messages in the Backlog in `enc` encoding.

###Canary.feedString(msg, callback)

This function takes a string argument, `msg`, to be verified and (hopefully) added to the Backlog of Canary messages.

Give it a one-argument callback, e.g., `function(err) { complainAbout(err); }`.

Writes are immediately synced to disk.

###Canary.feedStream(stream, callback)

This function takes a stream argument, `stream`, to be verified and (hopefully) added to the Backlog of Canary messages.

As above, it takes a one-argument callback for error reporting.

Writes are immediately synced to disk.

#Donate

Bitcoin: 1BtYJ5WPqg68Y4nDHGenxsmLA9VQyAWE6W
