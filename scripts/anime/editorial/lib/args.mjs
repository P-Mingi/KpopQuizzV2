// Run O1, lane E1a: the small argument parser the two command lines share.
export function parseArgs(argv, valueFlags = ['--data', '--inspiration', '--now'], boolFlags = ['--json', '--facts-draft-ok', '--help']) {
  const out = { paths: [], flags: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (valueFlags.includes(a)) {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      out.flags[a] = argv[i + 1];
      i += 1;
    } else if (boolFlags.includes(a)) out.flags[a] = true;
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else out.paths.push(a);
  }
  return out;
}

/** True when the module is the one node was started with. */
export function isMain(metaUrl) {
  return Boolean(process.argv[1]) && new URL(metaUrl).pathname === new URL(`file://${process.argv[1].startsWith('/') ? process.argv[1] : `${process.cwd()}/${process.argv[1]}`}`).pathname;
}
