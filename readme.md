# csgo-sync
This is an application to manage and syncronize your CS:GO configs across multiple computers and accounts.

```
? Please select an option
> Syncronize configs
  Import from file
  Import from URL
  ──────────────
  Export config
```

### Syncronize configs
This option allows you to select an account's config directory and syncronizes them across all other configs on the machine.

```
? Please select an option Syncronize configs
? Which config would you like to sync from?
  230908110 [xxxxxx]
  240756127 [xxxxxx]
> 60134171 [xxxxxx]
```

### Import from file
Import a previously exported configuration option to be syncronized across all configs on the machine.

### Import from web
Downloads a previously exported configuration object to be syncronized across all configs on the machine.  
I just used GitHub's Gist for this, but you can use whatever as long as the body of the response is the raw config object.  
For example, here is mine: [https://gist.githubusercontent.com/sbuggay/9cf8f862e962946d24ec30ff8701e59a/raw/14d6e177ffc058ae9b8913c83281ebcec5c868f0/pwnmonkey.json](https://gist.githubusercontent.com/sbuggay/9cf8f862e962946d24ec30ff8701e59a/raw/14d6e177ffc058ae9b8913c83281ebcec5c868f0/pwnmonkey.json)

### Export config
Exports config to a supported configuration serialization object.  
The files exported by default are:  
- autoexec.cfg
- config.cfg
- video.txt
