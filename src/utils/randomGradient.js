const GRADIENTS = [
  { name: 'teal-green', from: '#0f766e', to: '#22c55e' },
  { name: 'indigo-blue', from: '#4338ca', to: '#3b82f6' },
  { name: 'orange-pink', from: '#f97316', to: '#ec4899' },
  { name: 'premium-night', from: '#0b1221', to: '#1f2937' },
  { name: 'deep-graphite', from: '#111827', to: '#0f172a' },
  { name: 'midnight-ink', from: '#0b0f17', to: '#0f172a' },
];

const randomGradient = () => {
  const pick = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
  return {
    ...pick,
    css: `linear-gradient(135deg, ${pick.from}, ${pick.to})`,
  };
};

export { GRADIENTS, randomGradient };
