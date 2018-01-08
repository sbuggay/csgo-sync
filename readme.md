# csgo-sync
[![npm version](https://badge.fury.io/js/csgo-sync.svg)](https://badge.fury.io/js/csgo-sync)

csgo-sync is an application to manage and syncronize your CS:GO configs across multiple computers and accounts.  
While designed to work with CS:GO, csgo-sync is extensible enough to work for anything that uses multiple file-based configurations. For example to work for CS:S you can simply pass `--appId 240` at the command line.

## Usage

Requirements:
- Node [https://nodejs.org/en/](https://nodejs.org/en/)

After Node is installed, simply install csgo-sync globally and use it.

```
npm i -g csgo-sync
csgo-sync
```

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

## Options

```
csgo-sync --help

  Usage: entry [options]

  Options:

    -V, --version                 output the version number
    -a, --appId                   appid for selected game. default: 730 (CS:GO)
    -o, --outFile                 filename and path to export a config object to. default: ./config.json
    -u, --userDataPath <path>     Path to use for userdata. default: C:/Program Files (x86)/Steam/userdata
    -r, --cfgRelativePath <path>  Relative path from userdata. default: /local/cfg
    --steamApiKey <key>           Steam API key to resolve account names against Steam IDs.
    -h, --help                    output usage information
```

If the `STEAM_API_KEY` environment variable is set to a valid Steam API key, csgo-sync will attempt to resolve your config ids against their account name during selection. You can also pass this in through the command line flag `--steamApiKey`.
You can get a Steam API key here: [http://steamcommunity.com/dev/apikey](http://steamcommunity.com/dev/apikey)