export function reconcileTwoPlayerMembership({
  previousMembers,
  incomingMembers,
  knownHostId,
  selfId,
} = {}) {
  const previous = Array.isArray(previousMembers) ? previousMembers : [];
  const incoming = Array.isArray(incomingMembers) ? incomingMembers : [];
  const activeMembers = incoming.slice(0, 2);
  const nextHostId = activeMembers.find((member) => member?.role === "host")?.id ?? null;
  const previousIds = previous.map((member) => member?.id).join("|");
  const nextIds = activeMembers.map((member) => member?.id).join("|");

  return {
    activeMembers,
    nextHostId,
    shouldExit: incoming.length > 2 && !activeMembers.some((member) => member?.id === selfId),
    shouldReset: Boolean(
      (previousIds && previousIds !== nextIds)
      || (knownHostId && knownHostId !== nextHostId),
    ),
  };
}
