import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Package, Sparkles, Loader2, Gift, Info, Backpack, Check, Coins } from 'lucide-react';
import { useAuthStore } from '../services/authStore';
import { useCreditsStore } from '../services/creditsStore';
import { supabase } from '../services/supabase';
import {
  CHALLENGER_CASE, ITEM_POOL_RATE, COINS_POOL_RATE, IRL_ITEMS, COIN_TIERS,
  CosmeticItem, CaseReward, rollCase, generateRouletteItems
} from '../services/casesData';

const Cases = () => {
  const { user } = useAuthStore();
  const { profile, loadProfile } = useCreditsStore();
  const [isOpening, setIsOpening] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [reward, setReward] = useState<CaseReward | null>(null);
  const [rouletteItems, setRouletteItems] = useState<CaseReward[]>([]);
  const [roulettePosition, setRoulettePosition] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cosmetics, setCosmetics] = useState<CosmeticItem[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [equipping, setEquipping] = useState<string | null>(null);

  const rouletteRef = useRef<HTMLDivElement>(null);

  // Load cosmetics from Supabase
  useEffect(() => {
    const loadCosmetics = async () => {
      const { data } = await supabase.from('cosmetics').select('*');
      if (data) setCosmetics(data);
    };
    loadCosmetics();
  }, []);

  // Inventory items from profile
  const inventoryItems = useMemo(() => {
    if (!profile?.owned_cosmetics || cosmetics.length === 0) return [];
    return profile.owned_cosmetics
      .map(id => cosmetics.find(c => c.id === id))
      .filter((c): c is CosmeticItem => c !== null && c !== undefined);
  }, [profile?.owned_cosmetics, cosmetics]);

  // Equip/unequip cosmetic
  const handleEquip = async (itemId: string, itemType: string, isCurrentlyEquipped: boolean) => {
    if (!user || !profile || equipping) return;
    setEquipping(itemId);
    try {
      const updateField = itemType === 'title' ? 'equipped_title'
        : itemType === 'background' ? 'equipped_background'
        : 'equipped_border';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: isCurrentlyEquipped ? null : itemId })
        .eq('id', user.id);
      if (updateError) throw updateError;
      await loadProfile(user.id);
    } catch (err) {
      console.error('Equip error:', err);
      setError("Erreur lors de l'équipement");
    } finally {
      setEquipping(null);
    }
  };

  const openCase = async () => {
    if (!user || !profile || isOpening) return;

    if (profile.credits < CHALLENGER_CASE.price) {
      setError(`Pas assez de JC! Il te faut ${CHALLENGER_CASE.price.toLocaleString('fr-FR')} JC`);
      return;
    }

    setError(null);
    setIsOpening(true);
    setShowResult(false);
    setReward(null);

    try {
      // Deduct credits
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - CHALLENGER_CASE.price })
        .eq('id', user.id);
      if (deductError) throw deductError;

      // Roll
      const result = rollCase(cosmetics);
      setReward(result);

      // Generate roulette
      const itemCount = 50;
      const items = generateRouletteItems(cosmetics, result, itemCount);
      setRouletteItems(items);

      // Find winning position
      let winIndex = Math.floor(itemCount * 0.75);
      for (let i = Math.floor(itemCount * 0.7); i < itemCount; i++) {
        if (items[i] === result) { winIndex = i; break; }
      }

      // Animate
      const itemTotalWidth = 124;
      const containerWidth = rouletteRef.current?.offsetWidth || 600;
      const targetPosition = (winIndex * itemTotalWidth) - (containerWidth / 2) + (116 / 2);
      const randomOffset = Math.random() * 60 - 30;

      setRoulettePosition(0);
      await new Promise(resolve => setTimeout(resolve, 50));
      setRoulettePosition(-(targetPosition + randomOffset));
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Award
      if (result.kind === 'cosmetic' && result.cosmetic) {
        const current = profile.owned_cosmetics || [];
        if (!current.includes(result.cosmetic.id)) {
          const { error: cosmeticError } = await supabase
            .from('profiles')
            .update({ owned_cosmetics: [...current, result.cosmetic.id] })
            .eq('id', user.id);
          if (cosmeticError) throw cosmeticError;
        }
      } else if (result.kind === 'coins' && result.coinsAmount) {
        const { error: awardError } = await supabase
          .from('profiles')
          .update({ credits: profile.credits - CHALLENGER_CASE.price + result.coinsAmount })
          .eq('id', user.id);
        if (awardError) throw awardError;
      }
      // IRL rewards: display only (manual fulfillment)

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
    setReward(null);
    setRouletteItems([]);
    setRoulettePosition(0);
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
                  (item.type === 'border' && profile?.equipped_border === item.id);
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
                      <img src={item.image_url} alt={item.name} className="w-12 h-12 mx-auto mb-2 rounded-lg object-cover" />
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
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gold/20 text-gold">
                💰 Coins {COINS_POOL_RATE}%
              </span>
              {cosmetics.length > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-700 text-zinc-300">
                  {cosmetics.length} cosmétiques
                </span>
              )}
            </div>
          </div>

          {/* Open Button */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={openCase}
              disabled={isOpening || !profile || profile.credits < CHALLENGER_CASE.price}
              className={`px-8 py-4 rounded-xl font-black text-xl transition-all ${
                isOpening
                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                  : profile && profile.credits >= CHALLENGER_CASE.price
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
                  Ouvrir
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 text-gold font-mono font-bold">
              <Sparkles className="w-4 h-4" />
              {CHALLENGER_CASE.price.toLocaleString('fr-FR')} JC
            </div>
          </div>
        </div>

        {/* ===== PROBABILITÉS ===== */}
        <div className="mt-8 pt-8 border-t border-zinc-800">
          <div className="flex items-center gap-2 mb-6">
            <Info className="w-5 h-5 text-zinc-400" />
            <h3 className="font-bold text-white">Probabilités</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
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
                  <p className="text-[11px] text-zinc-500 pl-3">
                    Probabilité uniforme : {perCosmeticRate.toFixed(4)}% chacun
                  </p>
                )}
                {cosmetics.length === 0 && (
                  <p className="text-[11px] text-zinc-500 pl-3">
                    Cosmétiques bientôt disponibles!
                  </p>
                )}
              </div>
            </div>

            {/* Pool Coins */}
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
          </div>

          <p className="text-xs text-zinc-500 mt-4 text-center">
            Chaque ouverture donne soit un item, soit des coins — jamais les deux.
          </p>
        </div>
      </div>

      {/* ===== ROULETTE MODAL ===== */}
      {(isOpening || showResult) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-3xl border border-zinc-700 p-8 max-w-3xl w-full mx-4 shadow-2xl">
            {/* Roulette */}
            <div className="relative mb-8">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-gradient-to-b from-primary via-primary to-transparent z-10" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-primary z-10" />

              <div
                ref={rouletteRef}
                className="overflow-hidden rounded-2xl bg-zinc-800 border border-zinc-700"
                style={{ height: '140px' }}
              >
                <div
                  className="flex items-center gap-2 py-2 px-2 transition-transform ease-out"
                  style={{
                    transform: `translateX(${roulettePosition}px)`,
                    transitionDuration: isOpening && !showResult ? '4000ms' : '0ms',
                    transitionTimingFunction: 'cubic-bezier(0.15, 0.85, 0.35, 1)'
                  }}
                >
                  {rouletteItems.map((item, idx) => {
                    const display = getRewardDisplay(item);
                    const isWinning = showResult && reward && item === reward && idx >= Math.floor(rouletteItems.length * 0.7);
                    return (
                      <div
                        key={idx}
                        className={`flex-shrink-0 w-[116px] h-[120px] rounded-xl ${display.bg} border-2 ${
                          isWinning
                            ? 'border-primary shadow-lg shadow-primary/50 scale-105'
                            : 'border-white/10'
                        } flex flex-col items-center justify-center p-2 transition-all duration-300`}
                      >
                        {item.kind === 'cosmetic' && item.cosmetic?.image_url ? (
                          <img src={item.cosmetic.preview_url || item.cosmetic.image_url} alt={item.cosmetic.name} className="w-16 h-16 object-contain mb-1" />
                        ) : (
                          <div className="text-3xl mb-1">{display.icon}</div>
                        )}
                        <div className={`text-xs font-bold ${display.color} text-center truncate w-full`}>
                          {display.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Result */}
            {showResult && reward && (() => {
              const display = getRewardDisplay(reward);
              return (
                <div className="text-center animate-bounce-in">
                  <h2 className="text-3xl font-black text-white mb-2">
                    {display.icon} {display.name}
                  </h2>

                  {reward.kind === 'cosmetic' && (
                    <p className="text-zinc-400 mb-4">Ajouté à ton inventaire!</p>
                  )}
                  {reward.kind === 'coins' && (
                    <p className="text-gold text-xl font-mono font-bold mb-4">
                      +{(reward.coinsAmount || 0).toLocaleString('fr-FR')} Johnny Coins
                    </p>
                  )}
                  {reward.kind === 'irl' && (
                    <div className="mt-2 mb-4 p-4 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 inline-block">
                      <p className="text-pink-300 text-sm font-bold">
                        Lot IRL! Contacte un admin pour récupérer ton prix!
                      </p>
                    </div>
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
              );
            })()}

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
