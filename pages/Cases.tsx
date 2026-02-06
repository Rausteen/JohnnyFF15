import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Package, Sparkles, Loader2, Volume2, VolumeX, ChevronRight, Gift, Info, Backpack, Award, Type, Circle, Check } from 'lucide-react';
import { useAuthStore } from '../services/authStore';
import { useCreditsStore } from '../services/creditsStore';
import { supabase } from '../services/supabase';
import { CASES, Case, LootItem, RARITY_CONFIG, rollLoot, generateRouletteItems, getCaseExclusiveCosmetic, CASE_BADGES, CASE_TITLES, CASE_BORDERS } from '../services/casesData';
import { ALL_COSMETICS } from '../services/shopData';

// Helper to get cosmetic info from ID
function getCosmeticInfo(id: string): { type: string; name: string; icon?: string; gradient?: string; rarity: string } | null {
  // Check case-exclusive cosmetics first
  const caseCosmetic = getCaseExclusiveCosmetic(id);
  if (caseCosmetic) {
    return {
      type: caseCosmetic.type,
      name: caseCosmetic.name,
      icon: caseCosmetic.icon,
      gradient: caseCosmetic.gradient,
      rarity: caseCosmetic.rarity
    };
  }

  // Check shop cosmetics
  const shopCosmetic = ALL_COSMETICS.find(c => c.id === id);
  if (shopCosmetic) {
    return {
      type: shopCosmetic.type,
      name: shopCosmetic.name,
      icon: shopCosmetic.icon,
      gradient: shopCosmetic.gradient,
      rarity: shopCosmetic.rarity
    };
  }

  return null;
}

const Cases = () => {
  const { user } = useAuthStore();
  const { profile, loadProfile } = useCreditsStore();
  const [selectedCase, setSelectedCase] = useState<Case | null>(CASES[0]);
  const [isOpening, setIsOpening] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [wonItem, setWonItem] = useState<LootItem | null>(null);
  const [rouletteItems, setRouletteItems] = useState<LootItem[]>([]);
  const [roulettePosition, setRoulettePosition] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentDrops, setRecentDrops] = useState<{ pseudo: string; item: LootItem; caseId: string; timestamp: number }[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'badge' | 'title' | 'border'>('all');
  const [equipping, setEquipping] = useState<string | null>(null);

  const rouletteRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Parse owned cosmetics into display-ready items
  const inventoryItems = useMemo(() => {
    if (!profile?.owned_cosmetics) return [];

    return profile.owned_cosmetics
      .map(id => {
        const info = getCosmeticInfo(id);
        if (!info) return null;
        return { id, ...info };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => {
        // Sort by rarity (mythic first) then by type
        const rarityOrder = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
        const rarityDiff = rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
        if (rarityDiff !== 0) return rarityDiff;
        return a.type.localeCompare(b.type);
      });
  }, [profile?.owned_cosmetics]);

  // Filter inventory items
  const filteredInventory = useMemo(() => {
    if (inventoryFilter === 'all') return inventoryItems;
    return inventoryItems.filter(item => item.type === inventoryFilter);
  }, [inventoryItems, inventoryFilter]);

  // Count by type
  const inventoryCounts = useMemo(() => ({
    all: inventoryItems.length,
    badge: inventoryItems.filter(i => i.type === 'badge').length,
    title: inventoryItems.filter(i => i.type === 'title').length,
    border: inventoryItems.filter(i => i.type === 'border').length,
  }), [inventoryItems]);

  // Equip/unequip cosmetic from inventory
  const handleEquip = async (itemId: string, itemType: string, isCurrentlyEquipped: boolean) => {
    if (!user || !profile || equipping) return;

    setEquipping(itemId);

    try {
      const updateField = itemType === 'badge' ? 'equipped_badge'
        : itemType === 'title' ? 'equipped_title'
        : 'equipped_border';

      const newValue = isCurrentlyEquipped ? null : itemId;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: newValue })
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

  // Load recent drops from localStorage (simulated for now)
  useEffect(() => {
    const stored = localStorage.getItem('recentCaseDrops');
    if (stored) {
      setRecentDrops(JSON.parse(stored));
    }
  }, []);

  const saveRecentDrop = (pseudo: string, item: LootItem, caseId: string) => {
    const newDrop = { pseudo, item, caseId, timestamp: Date.now() };
    const updated = [newDrop, ...recentDrops].slice(0, 20);
    setRecentDrops(updated);
    localStorage.setItem('recentCaseDrops', JSON.stringify(updated));
  };

  const openCase = async () => {
    if (!selectedCase || !user || !profile || isOpening) return;

    // Check balance
    if (profile.credits < selectedCase.price) {
      setError(`Pas assez de JC! Il te faut ${selectedCase.price.toLocaleString('fr-FR')} JC`);
      return;
    }

    setError(null);
    setIsOpening(true);
    setShowResult(false);
    setWonItem(null);

    try {
      // Deduct credits first
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - selectedCase.price })
        .eq('id', user.id);

      if (deductError) throw deductError;

      // Roll the loot
      const result = rollLoot(selectedCase);
      setWonItem(result);

      // Generate roulette items (winning item is placed at ~75-80% position)
      const itemCount = 50;
      const items = generateRouletteItems(selectedCase, result, itemCount);
      setRouletteItems(items);

      // Find the winning item position (it's placed between 75-80% of the array)
      let winIndex = -1;
      for (let i = Math.floor(itemCount * 0.7); i < itemCount; i++) {
        if (items[i].id === result.id) {
          winIndex = i;
          break;
        }
      }
      if (winIndex === -1) winIndex = Math.floor(itemCount * 0.75); // Fallback

      // Calculate position (item width 116px + gap 8px = 124px per item)
      const itemTotalWidth = 124; // 116px width + 8px gap
      const containerWidth = rouletteRef.current?.offsetWidth || 600;
      const targetPosition = (winIndex * itemTotalWidth) - (containerWidth / 2) + (116 / 2);

      // Small random offset for more natural feel
      const randomOffset = Math.random() * 60 - 30;

      // Animate roulette
      setRoulettePosition(0);
      await new Promise(resolve => setTimeout(resolve, 50));
      setRoulettePosition(-(targetPosition + randomOffset));

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Award the prize
      if (result.type === 'jc' && result.jcAmount) {
        const { error: awardError } = await supabase
          .from('profiles')
          .update({ credits: profile.credits - selectedCase.price + result.jcAmount })
          .eq('id', user.id);
        if (awardError) throw awardError;
      } else if (result.type === 'badge' || result.type === 'title' || result.type === 'border') {
        // Add cosmetic to owned_cosmetics
        const currentCosmetics = profile.owned_cosmetics || [];
        if (!currentCosmetics.includes(result.id)) {
          const { error: cosmeticError } = await supabase
            .from('profiles')
            .update({ owned_cosmetics: [...currentCosmetics, result.id] })
            .eq('id', user.id);
          if (cosmeticError) throw cosmeticError;
        }
      } else if (result.type === 'ticket') {
        // Give a free case (handled elsewhere)
      }

      // Reload profile
      await loadProfile(user.id);

      // Save to recent drops
      saveRecentDrop(profile.pseudo, result, selectedCase.id);

      setShowResult(true);
    } catch (err: any) {
      console.error('Case opening error:', err);
      setError(err.message || 'Erreur lors de l\'ouverture');
      // Reload profile to sync balance
      await loadProfile(user.id);
    } finally {
      setIsOpening(false);
    }
  };

  const closeResult = () => {
    setShowResult(false);
    setWonItem(null);
    setRouletteItems([]);
    setRoulettePosition(0);
  };

  const getRarityStyle = (rarity: LootItem['rarity']) => RARITY_CONFIG[rarity];

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center gap-3 mb-4">
          <Package className="w-10 h-10 text-purple-400" />
          <h1 className="text-4xl font-black text-white">Caisses</h1>
        </div>
        <p className="text-zinc-400">Ouvre des caisses et tente ta chance pour des récompenses exclusives!</p>
      </div>

      {/* Balance & Inventory Toggle */}
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
          {inventoryCounts.all > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 text-sm font-mono">
              {inventoryCounts.all}
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-center max-w-md mx-auto">
          {error}
        </div>
      )}

      {/* Inventory Section */}
      {showInventory && (
        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 mb-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Backpack className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Mon Inventaire</h2>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: 'Tout', icon: Backpack },
                { key: 'badge', label: 'Badges', icon: Award },
                { key: 'title', label: 'Titres', icon: Type },
                { key: 'border', label: 'Bordures', icon: Circle },
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setInventoryFilter(filter.key as typeof inventoryFilter)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    inventoryFilter === filter.key
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <filter.icon className="w-4 h-4" />
                  {filter.label}
                  <span className="text-xs opacity-70">({inventoryCounts[filter.key as keyof typeof inventoryCounts]})</span>
                </button>
              ))}
            </div>
          </div>

          {filteredInventory.length === 0 ? (
            <div className="text-center py-12">
              <Backpack className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">
                {inventoryFilter === 'all'
                  ? "Ton inventaire est vide. Ouvre des caisses pour obtenir des cosmétiques!"
                  : `Aucun ${inventoryFilter === 'badge' ? 'badge' : inventoryFilter === 'title' ? 'titre' : 'bordure'} dans ton inventaire.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredInventory.map((item) => {
                const rarityConfig = RARITY_CONFIG[item.rarity as keyof typeof RARITY_CONFIG] || RARITY_CONFIG.common;
                const isEquipped =
                  (item.type === 'badge' && profile?.equipped_badge === item.id) ||
                  (item.type === 'title' && profile?.equipped_title === item.id) ||
                  (item.type === 'border' && profile?.equipped_border === item.id);

                const isEquippingThis = equipping === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleEquip(item.id, item.type, isEquipped)}
                    disabled={!!equipping}
                    className={`relative p-4 rounded-xl ${rarityConfig.bg} border-2 ${
                      isEquipped ? 'border-green-500 shadow-lg shadow-green-500/30' : 'border-white/10 hover:border-white/30'
                    } text-center transition-all hover:scale-105 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {/* Equipped indicator */}
                    {isEquipped && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}

                    {/* Loading indicator */}
                    {isEquippingThis && (
                      <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}

                    {/* Icon / Preview */}
                    {item.type === 'border' && item.gradient ? (
                      <div
                        className="w-12 h-12 mx-auto mb-2 rounded-full"
                        style={{ background: item.gradient }}
                      />
                    ) : (
                      <div className="text-3xl mb-2">
                        {item.icon || (item.type === 'title' ? '📜' : '🎁')}
                      </div>
                    )}

                    {/* Name */}
                    <div className={`text-sm font-bold ${rarityConfig.color} truncate`}>
                      {item.name}
                    </div>

                    {/* Type & Rarity */}
                    <div className="text-[10px] text-zinc-500 mt-1">
                      {item.type === 'badge' ? 'Badge' : item.type === 'title' ? 'Titre' : 'Bordure'}
                      {' • '}
                      {rarityConfig.label}
                    </div>

                    {/* Action hint */}
                    <div className={`text-[10px] mt-2 font-bold ${isEquipped ? 'text-red-400' : 'text-green-400'}`}>
                      {isEquipped ? 'Clic pour retirer' : 'Clic pour équiper'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tip */}
          <div className="mt-6 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
            <p className="text-sm text-zinc-400 text-center">
              <Info className="w-4 h-4 inline mr-2" />
              Clique sur un item pour l'équiper ou le retirer. Tu peux aussi gérer tes cosmétiques dans la <a href="#/shop" className="text-purple-400 hover:underline">Boutique</a>.
            </p>
          </div>
        </div>
      )}

      {/* Case Details & Open Button */}
      {selectedCase && (
        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 mb-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Case Preview */}
            <div className={`w-32 h-32 rounded-2xl bg-gradient-to-br ${selectedCase.color} flex items-center justify-center text-6xl shadow-xl ${selectedCase.glowColor}`}>
              {selectedCase.image}
            </div>

            {/* Case Details */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-black text-white mb-2">{selectedCase.name}</h2>
              <p className="text-zinc-400 mb-4">{selectedCase.description}</p>

              {/* Loot Preview */}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                {['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].map(rarity => {
                  const count = selectedCase.lootTable.filter(item => item.rarity === rarity).length;
                  if (count === 0) return null;
                  const style = getRarityStyle(rarity as any);
                  return (
                    <span key={rarity} className={`px-2 py-1 rounded-full text-xs font-bold ${style.bg} ${style.color}`}>
                      {count} {style.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Open Button */}
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={openCase}
                disabled={isOpening || !profile || profile.credits < selectedCase.price}
                className={`px-8 py-4 rounded-xl font-black text-xl transition-all ${
                  isOpening
                    ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                    : profile && profile.credits >= selectedCase.price
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
                {selectedCase.price.toLocaleString('fr-FR')} JC
              </div>
            </div>
          </div>

          {/* Loot Table Preview */}
          <div className="mt-8 pt-8 border-t border-zinc-800">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-zinc-400" />
              <h3 className="font-bold text-white">Contenu possible</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {selectedCase.lootTable.slice(0, 12).map((item, idx) => {
                const style = getRarityStyle(item.rarity);
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl ${style.bg} border border-white/5 text-center`}
                  >
                    <div className="text-2xl mb-1">
                      {item.type === 'jc' ? '💰' : item.icon || '🎁'}
                    </div>
                    <div className={`text-xs font-bold ${style.color} truncate`}>
                      {item.name}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {item.dropRate}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Roulette Animation Modal */}
      {(isOpening || showResult) && selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-3xl border border-zinc-700 p-8 max-w-3xl w-full mx-4 shadow-2xl">
            {/* Roulette */}
            <div className="relative mb-8">
              {/* Center indicator */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-gradient-to-b from-primary via-primary to-transparent z-10" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-primary z-10" />

              {/* Roulette container */}
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
                    const style = getRarityStyle(item.rarity);
                    const isWinningItem = showResult && wonItem && item.id === wonItem.id && idx >= Math.floor(rouletteItems.length * 0.7);
                    return (
                      <div
                        key={idx}
                        className={`flex-shrink-0 w-[116px] h-[120px] rounded-xl ${style.bg} border-2 ${
                          isWinningItem
                            ? 'border-primary shadow-lg shadow-primary/50 scale-105'
                            : 'border-white/10'
                        } flex flex-col items-center justify-center p-2 transition-all duration-300`}
                      >
                        <div className="text-3xl mb-1">
                          {item.type === 'jc' ? '💰' : item.icon || '🎁'}
                        </div>
                        <div className={`text-xs font-bold ${style.color} text-center truncate w-full`}>
                          {item.name}
                        </div>
                        <div className={`text-[10px] ${style.color} opacity-60`}>
                          {style.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Result */}
            {showResult && wonItem && (
              <div className="text-center animate-bounce-in">
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold mb-4 ${getRarityStyle(wonItem.rarity).bg} ${getRarityStyle(wonItem.rarity).color}`}>
                  {getRarityStyle(wonItem.rarity).label}
                </div>
                <h2 className="text-3xl font-black text-white mb-2">
                  {wonItem.type === 'jc' ? '💰' : wonItem.icon || '🎁'} {wonItem.name}
                </h2>
                {wonItem.type === 'jc' && wonItem.jcAmount && (
                  <p className="text-gold text-xl font-mono font-bold mb-4">
                    +{wonItem.jcAmount.toLocaleString('fr-FR')} Johnny Coins
                  </p>
                )}
                {wonItem.type !== 'jc' && (
                  <p className="text-zinc-400 mb-4">
                    Ajouté à ton inventaire!
                  </p>
                )}
                <button
                  onClick={closeResult}
                  className="px-8 py-3 bg-primary rounded-xl text-white font-bold hover:bg-primary/80 transition"
                >
                  Continuer
                </button>
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

      {/* Recent Drops */}
      {recentDrops.length > 0 && (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-400" />
            Drops récents
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentDrops.slice(0, 10).map((drop, idx) => {
              const style = getRarityStyle(drop.item.rarity);
              const caseData = CASES.find(c => c.id === drop.caseId);
              return (
                <div
                  key={idx}
                  className={`flex-shrink-0 p-3 rounded-xl ${style.bg} border border-white/5 text-center min-w-[120px]`}
                >
                  <div className="text-xs text-zinc-400 mb-1 truncate">{drop.pseudo}</div>
                  <div className="text-2xl mb-1">
                    {drop.item.type === 'jc' ? '💰' : drop.item.icon || '🎁'}
                  </div>
                  <div className={`text-xs font-bold ${style.color} truncate`}>
                    {drop.item.name}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {caseData?.name}
                  </div>
                </div>
              );
            })}
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
