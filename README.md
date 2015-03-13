#Node.js Warrant Canary

###Create the keyring

`gpg -a --export MyKeyName | gpg --no-default-keyring --keyring ./CanaryKeyring --import`

###Preparations and things to note

For general information on warrant canaries, visit https://www.eff.org/deeplinks/2014/04/warrant-canary-faq

This warrant canary was written under the assumption that the signing key is entirely inaccessible to it. It is the operator's responsibility to manage, store, secure, and, if necessary, destroy the signing key.

For ideal usefulness, store one copy of the signing key on a separate machine, and securely delete the key once it outlives its usefulness. Adding signed messages to the canary more frequently enables the key's deletion to be noticed more quickly by anyone watching.

The canary will not accept messages without a valid signature. That is to say that unsigned messages are messages without a valid signature. I suggest using `gpg`'s `--clearsign` flag to produce a signed message that is human-readable.

#API

Previous API documentation is now massively out of date.

If you're an interested party who needs documentation, contact me and I'll answer your questions, and probably write up-to-date docs in the process.

