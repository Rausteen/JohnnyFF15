import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Package, Sparkles, Loader2, Gift, Info, Backpack, Check, Coins, Minus, Plus } from 'lucide-react';
import { useAuthStore } from '../services/authStore';
import { useCreditsStore } from '../services/creditsStore';
import { supabase } from '../services/supabase';
import { fetchAllCosmetics } from '../services/fetchAllCosmetics';
import {
  CHALLENGER_CASE, ITEM_POOL_RATE, COINS_POOL_RATE, IRL_ITEMS, COIN_TIERS,
  CosmeticItem, CaseReward, rollCase, generateRouletteItems
} from '../services/casesData';

interface RouletteSlot {
  items: CaseReward[];
  position: number;
  reward: CaseReward;
}

const ANIM_DURATION = 4000;

const Cases = () => {
  const { user } = useAuthStore();
  const { profile, loadProfile } = useCreditsStore();
  const [isOpening, setIsOpening] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cosmetics, setCosmetics] = useState<CosmeticItem[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [equipping, setEquipping] = useState<string | null>(null);

  // Multi-case state
  const [quantity, setQuantity] = useState(1);
  const [slots, setSlots] = useState<RouletteSlot[]>([]);

  const rouletteContainerRef = useRef<HTMLDivElement>(null);

  // Load cosmetics from Supabase (paginated to get all rows)
  useEffect(() => {
    fetchAllCosmetics().then(data => setCosmetics(data));
  }, []);

  // Inventory items from profile
  const inventoryItems = useMemo(() => {
    if (!profile?.owned_cosmetics || cosmetics.length === 0) return [];
    return profile.owned_cosmetics
      .map(id => cosmetics.find(c => c.id === id))
      .filter((c): c is CosmeticItem => c !== null && c !== undefined);
  }, [profile?.owned_cosmetics, cosmetics]);

  // Equip/unequip cosmetic — optimistic update for instant feedback
  const handleEquip = async (itemId: string, itemType: string, isCurrentlyEquipped: boolean) => {
    if (!user || !profile || equipping) return;
    setEquipping(itemId);
    try {
      const updateField = itemType === 'title' ? 'equipped_title'
        : itemType === 'background' ? 'equipped_background'
        : 'equipped_border';
      const newValue = isCurrentlyEquipped ? null : itemId;

      const { setProfile } = useCreditsStore.getState();
      setProfile({ ...profile, [updateField]: newValue });

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: newValue })
        .eq('id', user.id);

      if (updateError) {
        setProfile(profile);
        throw updateError;
      }
    } catch (err) {
      console.error('Equip error:', err);
      setError("Erreur lors de l'équipement");
    } finally {
      setEquipping(null);
    }
  };

  // Open N cases simultaneously
  const openCases = async () => {
    if (!user || !profile || isOpening) return;

    const totalCost = CHALLENGER_CASE.price * quantity;
    if (CHALLENGER_CASE.price > 0 && profile.credits < totalCost) {
      setError(`Pas assez de JC! Il te faut ${totalCost.toLocaleString('fr-FR')} JC`);
      return;
    }

    setError(null);
    setIsOpening(true);
    setShowResult(false);

    try {
      // Deduct total credits (skip if free)
      if (CHALLENGER_CASE.price > 0) {
        const { error: deductError } = await supabase
          .from('profiles')
          .update({ credits: profile.credits - totalCost })
          .eq('id', user.id);
        if (deductError) throw deductError;
      }

      // Roll all cases at once
      const containerWidth = rouletteContainerRef.current?.offsetWidth || 600;
      const itemTotalWidth = 124;
      const itemCount = 50;

      const newSlots: RouletteSlot[] = [];
      for (let i = 0; i < quantity; i++) {
        const reward = rollCase(cosmetics);
        const items = generateRouletteItems(cosmetics, reward, itemCount);

        let winIndex = Math.floor(itemCount * 0.75);
        for (let j = Math.floor(itemCount * 0.7); j < itemCount; j++) {
          if (items[j] === reward) { winIndex = j; break; }
        }

        const targetPosition = (winIndex * itemTotalWidth) - (containerWidth / 2) + (116 / 2);
        const randomOffset = Math.random() * 60 - 30;

        newSlots.push({
          items,
          position: -(targetPosition + randomOffset),
          reward,
        });
      }

      // Set slots at position 0 first
      setSlots(newSlots.map(s => ({ ...s, position: 0 })));

      // After a frame, animate all to their target positions simultaneously
      await new Promise(resolve => setTimeout(resolve, 50));
      setSlots(newSlots);

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, ANIM_DURATION));

      // Award all cosmetics
      const currentProfile = useCreditsStore.getState().profile;
      const currentOwned = [...(currentProfile?.owned_cosmetics || [])];
      const newCosmetics: string[] = [];

      for (const slot of newSlots) {
        if (slot.reward.kind === 'cosmetic' && slot.reward.cosmetic) {
          if (!currentOwned.includes(slot.reward.cosmetic.id) && !newCosmetics.includes(slot.reward.cosmetic.id)) {
            newCosmetics.push(slot.reward.cosmetic.id);
          }
        }
      }

      if (newCosmetics.length > 0) {
        const { error: cosmeticError } = await supabase
          .from('profiles')
          .update({ owned_cosmetics: [...currentOwned, ...newCosmetics] })
          .eq('id', user.id);
        if (cosmeticError) throw cosmeticError;
      }

      await loadProfile(user.id);
      setShowResult(true);
    } catch (err: any) {
      console.error('Case opening error:', err);
      setError(err.message || "Erreur lors de l'ouverture");
      await loadProfile(user.id);
    } finally {
      setIsOpening(false);
    }
  };

  const closeResult = () => {
    setShowResult(false);
    setSlots([]);
  };

  // Helper: get display info for a CaseReward
  const getRewardDisplay = (r: CaseReward) => {
    if (r.kind === 'cosmetic' && r.cosmetic) {
      return { icon: r.cosmetic.image_url ? '🖼️' : '🎁', name: r.cosmetic.name, color: 'text-purple-400', bg: 'bg-purple-500/20' };
    }
    if (r.kind === 'irl') {
      return { icon: r.irlIcon || '🏆', name: r.irlName || 'IRL', color: 'text-pink-400', bg: 'bg-pink-500/20' };
    }
    return { icon: '💰', name: `+${(r.coinsAmount || 0).toLocaleString('fr-FR')} JC`, color: 'text-gold', bg: 'bg-gold/20' };
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Connecte-toi pour ouvrir des caisses</h2>
          <p className="text-zinc-400">Tu dois être connecté pour accéder aux caisses.</p>
        </div>
      </div>
    );
  }

  const cosmeticsRate = (ITEM_POOL_RATE - IRL_ITEMS.reduce((s, i) => s + i.globalRate, 0));
  const perCosmeticRate = cosmetics.length > 0 ? (cosmeticsRate / cosmetics.length) : 0;
  const bordersCount = cosmetics.filter(c => c.type === 'border').length;
  const backgroundsCount = cosmetics.filter(c => c.type === 'background').length;

  const totalCost = CHALLENGER_CASE.price * quantity;
  const canOpen = profile && (CHALLENGER_CASE.price === 0 || profile.credits >= totalCost);

  // Quantity presets
  const quantityPresets = [1, 3, 5, 10];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center gap-3 mb-4">
          <Package className="w-10 h-10 text-purple-400" />
          <h1 className="text-4xl font-black text-white">Challenger Case</h1>
        </div>
        <p className="text-zinc-400">Ouvre la caisse et tente ta chance!</p>
      </div>

      {/* Balance & Inventory */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-gold/10 to-amber-900/20 border border-gold/30">
          <Sparkles className="w-5 h-5 text-gold" />
          <span className="text-xl font-mono font-bold text-gold">
            {profile?.credits.toLocaleString('fr-FR') || 0} JC
          </span>
        </div>
        <button
          onClick={() => setShowInventory(!showInventory)}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-full border transition-all ${
            showInventory
              ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
          }`}
        >
          <Backpack className="w-5 h-5" />
          <span className="font-bold">Inventaire</span>
          {inventoryItems.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 text-sm font-mono">
              {inventoryItems.length}
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-center max-w-md mx-auto">
          {error}
        </div>
      )}

      {/* Inventory */}
      {showInventory && (
        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Backpack className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Mon Inventaire</h2>
          </div>

          {inventoryItems.length === 0 ? (
            <div className="text-center py-12">
              <Backpack className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">Ton inventaire est vide. Ouvre des caisses pour obtenir des cosmétiques!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {inventoryItems.map((item) => {
                const isEquipped =
                  (item.type === 'title' && profile?.equipped_title === item.id) ||
                  (item.type === 'border' && profile?.equipped_border === item.id) ||
                  (item.type === 'background' && profile?.equipped_background === item.id);
                const isEquippingThis = equipping === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleEquip(item.id, item.type, isEquipped)}
                    disabled={!!equipping}
                    className={`relative p-4 rounded-xl bg-zinc-800/50 border-2 ${
                      isEquipped ? 'border-green-500 shadow-lg shadow-green-500/30' : 'border-white/10 hover:border-white/30'
                    } text-center transition-all hover:scale-105 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {isEquipped && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {isEquippingThis && (
                      <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                    {item.image_url ? (
                      item.type === 'background' ? (
                        <video src={item.image_url} preload="auto" muted playsInline className="w-12 h-12 mx-auto mb-2 rounded-lg object-cover" />
                      ) : (
                        <img src={item.image_url} alt={item.name} className="w-12 h-12 mx-auto mb-2 rounded-lg object-cover" />
                      )
                    ) : (
                      <div className="text-3xl mb-2">🎁</div>
                    )}
                    <div className="text-sm font-bold text-white truncate">{item.name}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      {item.type === 'border' ? 'Bordure' : item.type === 'title' ? 'Titre' : 'Background'}
                    </div>
                    <div className={`text-[10px] mt-2 font-bold ${isEquipped ? 'text-red-400' : 'text-green-400'}`}>
                      {isEquipped ? 'Clic pour retirer' : 'Clic pour équiper'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Case Card & Open Button */}
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 mb-12">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Case Preview */}
          <div className={`w-32 h-32 rounded-2xl bg-gradient-to-br ${CHALLENGER_CASE.color} flex items-center justify-center text-6xl shadow-xl ${CHALLENGER_CASE.glowColor}`}>
            {CHALLENGER_CASE.image}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-black text-white mb-2">{CHALLENGER_CASE.name}</h2>
            <p className="text-zinc-400 mb-4">{CHALLENGER_CASE.description}</p>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400">
                🎁 Items {ITEM_POOL_RATE}%
              </span>
              {COINS_POOL_RATE > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gold/20 text-gold">
                  💰 Coins {COINS_POOL_RATE}%
                </span>
              )}
              {bordersCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-700 text-zinc-300">
                  🖼️ {bordersCount} bordures
                </span>
              )}
              {backgroundsCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-700 text-zinc-300">
                  🎬 {backgroundsCount} backgrounds
                </span>
              )}
            </div>
          </div>

          {/* Quantity + Open Button */}
          <div className="flex flex-col items-center gap-4">
            {/* Quantity selector */}
            <div className="flex items-center gap-2">
              {quantityPresets.map(q => (
                <button
                  key={q}
                  onClick={() => setQuantity(q)}
                  disabled={isOpening}
                  className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                    quantity === q
                      ? 'bg-purple-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  } disabled:opacity-50`}
                >
                  {q}
                </button>
              ))}
              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={isOpening || quantity <= 1}
                  className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 flex items-center justify-center disabled:opacity-50"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-white font-mono font-bold text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(20, quantity + 1))}
                  disabled={isOpening || quantity >= 20}
                  className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 flex items-center justify-center disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              onClick={openCases}
              disabled={isOpening || !canOpen}
              className={`px-8 py-4 rounded-xl font-black text-xl transition-all ${
                isOpening
                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                  : canOpen
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30'
                  : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              }`}
            >
              {isOpening ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Ouverture...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Gift className="w-6 h-6" />
                  Ouvrir {quantity > 1 ? `x${quantity}` : ''}
                </span>
              )}
            </button>
            <div className="text-center">
              {CHALLENGER_CASE.price > 0 ? (
                <div className="flex items-center gap-2 text-gold font-mono font-bold">
                  <Sparkles className="w-4 h-4" />
                  {totalCost.toLocaleString('fr-FR')} JC
                </div>
              ) : (
                <div className="text-green-400 font-bold text-sm">GRATUIT</div>
              )}
            </div>
          </div>
        </div>

        {/* ===== PROBABILITÉS ===== */}
        <div className="mt-8 pt-8 border-t border-zinc-800">
          <div className="flex items-center gap-2 mb-6">
            <Info className="w-5 h-5 text-zinc-400" />
            <h3 className="font-bold text-white">Probabilités</h3>
          </div>

          <div className={`grid ${COINS_POOL_RATE > 0 ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-xl mx-auto'} gap-6`}>
            {/* Pool Items */}
            <div className="p-5 rounded-2xl bg-zinc-800/50 border border-zinc-700">
              <div className="flex items-center gap-2 mb-4">
                <Gift className="w-5 h-5 text-purple-400" />
                <h4 className="font-bold text-white">Pool Items — {ITEM_POOL_RATE}%</h4>
              </div>

              <div className="space-y-2">
                {IRL_ITEMS.map(irl => (
                  <div key={irl.id} className="flex justify-between items-center px-3 py-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
                    <span className="text-pink-300 font-bold text-sm">{irl.icon} {irl.name}</span>
                    <span className="text-zinc-400 text-sm font-mono">{irl.globalRate}%</span>
                  </div>
                ))}

                <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <span className="text-purple-300 font-bold text-sm">🎁 Cosmétiques ({cosmetics.length})</span>
                  <span className="text-zinc-400 text-sm font-mono">{cosmeticsRate.toFixed(2)}%</span>
                </div>
                {cosmetics.length > 0 && (
                  <div className="text-[11px] text-zinc-500 pl-3 space-y-0.5">
                    <p>🖼️ {bordersCount} bordures • 🎬 {backgroundsCount} backgrounds</p>
                    <p>Probabilité uniforme : {perCosmeticRate.toFixed(4)}% chacun</p>
                  </div>
                )}
                {cosmetics.length === 0 && (
                  <p className="text-[11px] text-zinc-500 pl-3">
                    Cosmétiques bientôt disponibles!
                  </p>
                )}
              </div>
            </div>

            {/* Pool Coins — only show if coins are enabled */}
            {COINS_POOL_RATE > 0 && (
              <div className="p-5 rounded-2xl bg-zinc-800/50 border border-zinc-700">
                <div className="flex items-center gap-2 mb-4">
                  <Coins className="w-5 h-5 text-gold" />
                  <h4 className="font-bold text-white">Pool Coins — {COINS_POOL_RATE}%</h4>
                </div>

                <div className="space-y-2">
                  {COIN_TIERS.map(tier => (
                    <div key={tier.amount} className="flex justify-between items-center px-3 py-2 rounded-lg bg-gold/5 border border-gold/10">
                      <span className="text-gold font-bold text-sm">💰 {tier.label}</span>
                      <span className="text-zinc-400 text-sm font-mono">{tier.rate}%</span>
                    </div>
                  ))}
                  <p className="text-[11px] text-zinc-500 pl-3">
                    Distribution interne (si coins tiré)
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-500 mt-4 text-center">
            {COINS_POOL_RATE > 0
              ? "Chaque ouverture donne soit un item, soit des coins — jamais les deux."
              : "Chaque ouverture donne un cosmétique aléatoire."
            }
          </p>
        </div>
      </div>

      {/* ===== ROULETTE MODAL ===== */}
      {(isOpening || showResult) && slots.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-3xl border border-zinc-700 p-6 sm:p-8 max-w-3xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Title */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono font-bold text-sm">
                {slots.length} caisse{slots.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* All roulettes stacked */}
            <div className="space-y-3 mb-6">
              {slots.map((slot, slotIdx) => (
                <div key={slotIdx} className="relative">
                  {/* Center indicator */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-primary via-primary to-transparent z-10 pointer-events-none" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-primary z-10 pointer-events-none" />

                  <div
                    ref={slotIdx === 0 ? rouletteContainerRef : undefined}
                    className="overflow-hidden rounded-xl bg-zinc-800 border border-zinc-700"
                    style={{ height: slots.length > 5 ? '100px' : '120px' }}
                  >
                    <div
                      className="flex items-center gap-2 py-1.5 px-2 transition-transform ease-out"
                      style={{
                        transform: `translateX(${slot.position}px)`,
                        transitionDuration: isOpening && !showResult ? `${ANIM_DURATION}ms` : '0ms',
                        transitionTimingFunction: 'cubic-bezier(0.15, 0.85, 0.35, 1)'
                      }}
                    >
                      {slot.items.map((item, idx) => {
                        const display = getRewardDisplay(item);
                        const isWinning = showResult && item === slot.reward && idx >= Math.floor(slot.items.length * 0.7);
                        const compact = slots.length > 5;
                        return (
                          <div
                            key={idx}
                            className={`flex-shrink-0 ${compact ? 'w-[90px] h-[88px]' : 'w-[116px] h-[108px]'} rounded-lg ${display.bg} border-2 ${
                              isWinning
                                ? 'border-primary shadow-lg shadow-primary/50 scale-105'
                                : 'border-white/10'
                            } flex flex-col items-center justify-center p-1.5 transition-all duration-300`}
                          >
                            {item.kind === 'cosmetic' && item.cosmetic?.image_url ? (
                              item.cosmetic.type === 'background' ? (
                                <video src={item.cosmetic.image_url} preload="metadata" muted className={`${compact ? 'w-10 h-10' : 'w-14 h-14'} object-cover rounded mb-0.5`} />
                              ) : (
                                <img src={item.cosmetic.preview_url || item.cosmetic.image_url} alt={item.cosmetic.name} className={`${compact ? 'w-10 h-10' : 'w-14 h-14'} object-contain mb-0.5`} />
                              )
                            ) : (
                              <div className={`${compact ? 'text-2xl' : 'text-3xl'} mb-0.5`}>{display.icon}</div>
                            )}
                            <div className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-bold ${display.color} text-center truncate w-full`}>
                              {display.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Results */}
            {showResult && (
              <div className="text-center animate-bounce-in">
                {slots.length === 1 ? (
                  // Single result
                  (() => {
                    const display = getRewardDisplay(slots[0].reward);
                    return (
                      <>
                        <h2 className="text-3xl font-black text-white mb-2">
                          {display.icon} {display.name}
                        </h2>
                        {slots[0].reward.kind === 'cosmetic' && (
                          <div className="mb-4">
                            {slots[0].reward.cosmetic?.type === 'background' && slots[0].reward.cosmetic.image_url && (
                              <video src={slots[0].reward.cosmetic.image_url} autoPlay loop muted playsInline className="w-48 h-28 object-cover rounded-xl mx-auto mb-3 border border-white/20" />
                            )}
                            <p className="text-zinc-400">Ajouté à ton inventaire!</p>
                          </div>
                        )}
                        {slots[0].reward.kind === 'irl' && (
                          <div className="mt-2 mb-4 p-4 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 inline-block">
                            <p className="text-pink-300 text-sm font-bold">
                              Lot IRL! Contacte un admin pour récupérer ton prix!
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()
                ) : (
                  // Multi results summary
                  <>
                    <h2 className="text-xl font-black text-white mb-3">
                      {slots.length} caisses ouvertes
                    </h2>
                    <div className="max-h-48 overflow-y-auto mb-3 space-y-1.5">
                      {slots.map((slot, i) => {
                        const display = getRewardDisplay(slot.reward);
                        return (
                          <div key={i} className={`flex items-center gap-3 px-4 py-2 rounded-xl ${display.bg} border border-white/10`}>
                            <span className="text-zinc-500 font-mono text-xs w-6">#{i + 1}</span>
                            {slot.reward.kind === 'cosmetic' && slot.reward.cosmetic?.image_url ? (
                              slot.reward.cosmetic.type === 'background' ? (
                                <video src={slot.reward.cosmetic.image_url} preload="metadata" muted className="w-8 h-8 object-cover rounded" />
                              ) : (
                                <img src={slot.reward.cosmetic.preview_url || slot.reward.cosmetic.image_url} alt={slot.reward.cosmetic.name} className="w-8 h-8 object-contain rounded" />
                              )
                            ) : (
                              <span className="text-xl w-8 text-center">{display.icon}</span>
                            )}
                            <span className={`font-bold text-sm ${display.color}`}>{display.name}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Deduplicated count */}
                    {(() => {
                      const counts = new Map<string, { reward: CaseReward; count: number }>();
                      slots.forEach(s => {
                        const r = s.reward;
                        const key = r.kind === 'cosmetic' ? r.cosmetic?.id || 'unknown' : r.kind === 'irl' ? (r.irlName || 'irl') : `coins-${r.coinsAmount}`;
                        const existing = counts.get(key);
                        if (existing) existing.count++;
                        else counts.set(key, { reward: r, count: 1 });
                      });
                      const duplicates = [...counts.values()].filter(v => v.count > 1);
                      if (duplicates.length === 0) return null;
                      return (
                        <p className="text-zinc-500 text-xs mb-2">
                          {duplicates.map(d => {
                            const display = getRewardDisplay(d.reward);
                            return `${display.name} x${d.count}`;
                          }).join(' • ')}
                        </p>
                      );
                    })()}
                  </>
                )}

                <div className="mt-4">
                  <button
                    onClick={closeResult}
                    className="px-8 py-3 bg-primary rounded-xl text-white font-bold hover:bg-primary/80 transition"
                  >
                    Continuer
                  </button>
                </div>
              </div>
            )}

            {isOpening && !showResult && (
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-zinc-400">Ouverture en cours...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS for bounce animation */}
      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Cases;
