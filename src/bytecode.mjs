/** Compare runtime bytecode while allowing only compiler-reported immutable slots. */
export function matchesRuntimeBytecode(code, artifact) {
  if (
    typeof code !== "string" ||
    code.length !== artifact.deployedBytecode.length
  )
    return false;
  const actual = code.toLowerCase().slice(2).split(""),
    expected = artifact.deployedBytecode.toLowerCase().slice(2).split("");
  for (const entries of Object.values(artifact.immutableReferences || {}))
    for (const { start, length } of entries) {
      for (let i = start * 2; i < (start + length) * 2; i++) {
        actual[i] = "0";
        expected[i] = "0";
      }
    }
  return actual.join("") === expected.join("");
}
