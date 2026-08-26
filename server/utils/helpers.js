const inr = (n) => `₹${parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const parseEventRequestMessage = (messageText) => {
  if (!messageText) return {};
  const extract = (key) => {
    const regex = new RegExp(`^${key}:\\s*(.*)$`, 'im');
    const match = messageText.match(regex);
    return match ? match[1].trim() : '';
  };

  const descIdx = messageText.indexOf("Description:");
  let description = "";
  if (descIdx !== -1) {
    description = messageText
      .substring(descIdx + 12)
      .replace(/\[STATUS:\s*\w+\]/gi, "")
      .trim();
  }

  return {
    organisation: extract('Organisation'),
    proposer: extract('Proposer'),
    designation: extract('Designation'),
    activities: extract('Event Activities') || extract('Format') || extract('Type'),
    category: extract('Category'),
    audience: extract('Audience'),
    date: extract('Date'),
    time: extract('Time'),
    location: extract('Location'),
    phone: extract('Phone'),
    description,
  };
};

module.exports = { inr, parseEventRequestMessage };

