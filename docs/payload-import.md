# Payload import

The importer consumes a versioned JSON export and writes through the generic content service. It never creates a table for a Payload collection. Collections are mapped to registered NodePress content types.

```bash
npm run payload:import -- \
  --file ./payload-export.json \
  --mapping ./docs/examples/payload-mapping.json \
  --batch-size 100 \
  --resume \
  --report ./tmp/payload-report.json
```

Use `--dry-run` to validate and normalize records without writing content or checkpoints. The importer records `(source, collection, sourceId)` in `np_import_records`, so a repeated run skips completed records. Relationships are resolved after primary records have been imported; missing targets are reported as warnings. Media download failures retain the original URL and are also reported.

The JSON export shape is:

```json
{
  "version": 1,
  "source": "payload-production",
  "collections": [
    { "name": "animals", "records": [{ "id": "a1", "data": { "name": "Rex" } }] }
  ]
}
```

The REST source uses the same shape and can be consumed by `RestPayloadSource` with a Payload JWT. A REST endpoint is intentionally not wired into the CLI yet, so credentials are not accepted through shell history by default.
