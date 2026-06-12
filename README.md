# UpsertCustomFields

This utility reads a CSV metadata file and upserts SuiteCRM configuration commands into `config.php` and `config.sql` files.

Usage:

```
node bin/UpsertCustomFields.js <STATE> <input.csv> <configDir>
```

Example:

```
node bin/UpsertCustomFields.js AK metadata.csv ./outputDir
```

This will filter rows where the `states` column includes `AK`, then update or append the PHP and SQL snippets in `./outputDir/config.php` and `./outputDir/config.sql`.
