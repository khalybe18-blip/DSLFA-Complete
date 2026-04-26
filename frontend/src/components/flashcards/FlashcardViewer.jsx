import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, ChevronLeft, ChevronRight, Lightbulb, Eye, EyeOff, Layers, X } from 'lucide-react';

// Card type → gradient mapping
const TYPE_GRADIENTS = {
  definition: 'from-blue-500 via-cyan-500 to-teal-400',
  concept: 'from-violet-500 via-purple-500 to-indigo-500',
  formula: 'from-amber-500 via-orange-500 to-red-400',
  cloze: 'from-emerald-500 via-green-500 to-lime-400',
};

const TYPE_LABELS = {
  definition: '📘 Definition',
  concept: '💡 Concept',
  formula: '🔢 Formula',
  cloze: '✏️ Fill in the Blank',
};

const DIFFICULTY_BADGES = {
  easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const FlashcardViewer = ({ deck, onExit }) => {
  const cards = deck.cards || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [knownCards, setKnownCards] = useState(new Set());
  const [direction, setDirection] = useState(0); // -1 left, 1 right for slide animation

  if (cards.length === 0) return <div className="text-center py-12 dark:text-white">No cards generated.</div>;

  const card = cards[currentIndex];
  const gradient = TYPE_GRADIENTS[card.type] || TYPE_GRADIENTS.concept;

  const goToCard = (newIndex) => {
    if (newIndex < 0 || newIndex >= cards.length) return;
    setDirection(newIndex > currentIndex ? 1 : -1);
    setCurrentIndex(newIndex);
    setIsFlipped(false);
    setShowHint(false);
  };

  const toggleKnown = () => {
    setKnownCards((prev) => {
      const next = new Set(prev);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
  };

  const progress = ((currentIndex + 1) / cards.length) * 100;
  const masteredCount = knownCards.size;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold dark:text-white transition-colors">{deck.deckTitle}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{deck.subject}</p>
        </div>
        <button
          onClick={onExit}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>Card {currentIndex + 1} of {cards.length}</span>
          <span className="text-emerald-600 dark:text-emerald-400">{masteredCount} mastered</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* The Flashcard */}
      <div className="perspective-1000" style={{ perspective: '1200px' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${currentIndex}-${isFlipped}`}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60, rotateY: isFlipped ? 0 : 0 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            onClick={() => setIsFlipped(!isFlipped)}
            className="cursor-pointer select-none"
          >
            <div className={`relative min-h-[340px] rounded-3xl p-1 bg-gradient-to-br ${gradient} shadow-2xl shadow-violet-500/10 dark:shadow-black/30`}>
              <div className="bg-white dark:bg-slate-900 rounded-[1.35rem] h-full min-h-[332px] p-8 flex flex-col justify-between transition-colors">
                {/* Card header badges */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {TYPE_LABELS[card.type] || card.type}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${DIFFICULTY_BADGES[card.difficulty] || DIFFICULTY_BADGES.medium}`}>
                      {card.difficulty}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {card.category}
                    </span>
                  </div>
                </div>

                {/* Card content */}
                <div className="flex-1 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isFlipped ? 'back' : 'front'}
                      initial={{ opacity: 0, scale: 0.92, rotateX: 12 }}
                      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                      exit={{ opacity: 0, scale: 0.92, rotateX: -12 }}
                      transition={{ duration: 0.25 }}
                      className="text-center w-full"
                    >
                      {!isFlipped ? (
                        <div>
                          <p className="text-xl font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                            {card.front}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 animate-pulse">
                            Tap to reveal answer
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-lg text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {card.back}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Hint bar */}
                <div className="mt-4 min-h-[28px]">
                  {card.hint && !isFlipped && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowHint(!showHint); }}
                      className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                    >
                      <Lightbulb size={14} />
                      {showHint ? card.hint : 'Show hint'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => goToCard(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-all"
        >
          <ChevronLeft size={18} /> Prev
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleKnown}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              knownCards.has(card.id)
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            }`}
          >
            {knownCards.has(card.id) ? <Eye size={16} /> : <EyeOff size={16} />}
            {knownCards.has(card.id) ? 'Mastered' : 'Mark known'}
          </button>

          <button
            onClick={() => { setIsFlipped(false); setShowHint(false); }}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Reset card"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <button
          onClick={() => goToCard(currentIndex + 1)}
          disabled={currentIndex === cards.length - 1}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-40 shadow-md shadow-violet-500/20 transition-all"
        >
          Next <ChevronRight size={18} />
        </button>
      </div>

      {/* Card strip (mini nav) */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2">
        {cards.map((c, i) => (
          <button
            key={c.id}
            onClick={() => goToCard(i)}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              i === currentIndex
                ? 'bg-violet-500 scale-125 shadow-md shadow-violet-400/50'
                : knownCards.has(c.id)
                  ? 'bg-emerald-400 dark:bg-emerald-500'
                  : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
            }`}
            title={`Card ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default FlashcardViewer;
