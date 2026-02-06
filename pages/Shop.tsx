import React, { useState } from 'react';
import { ShoppingBag, Sparkles, Crown, Frame, Check, Loader2, AlertCircle, Lock } from 'lucide-react';
import { useCreditsStore } from '../services/creditsStore';
import { useAuthStore } from '../services/authStore';
import {
  BADGES,
  TITLES,
  BORDERS,
  CosmeticItem,
  getRarityColor,
  getRarityBg,
  getRarityLabel,
} from '../services/shopData';
import { supabase } from '../services/supabase';

type TabType = 'badges' | 'titles' | 'borders';

const Shop: React.FC = () => {
  const { profile, refreshProfile } = useCreditsStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('badges');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const credits = profile?.credits || 0;
  const ownedCosmetics: string[] = profile?.owned_cosmetics || [];
  const equippedBadge = profile?.equipped_badge || null;
  const equippedTitle = profile?.equipped_title || null;
  const equippedBorder = profile?.equipped_border || null;

  const getItemsForTab = (): CosmeticItem[] => {
    switch (activeTab) {
      case 'badges': return BADGES;
      case 'titles': return TITLES;
      case 'borders': return BORDERS;
    }
  };

  const isOwned = (itemId: string) => ownedCosmetics.includes(itemId);

  const isEquipped = (item: CosmeticItem) => {
    switch (item.type) {
      case 'badge': return equippedBadge === item.id;
      case 'title': return equippedTitle === item.id;
      case 'border': return equippedBorder === item.id;
    }
  };

  const handlePurchase = async (item: CosmeticItem) => {
    if (!user || !profile) {
      setError("Connecte-toi pour acheter !");
      return;
    }

    if (isOwned(item.id)) {
      setError("Tu possèdes déjà cet item !");
      return;
    }

    if (credits < item.price) {
      setError("Pas assez de Johnny Coins !");
      return;
    }

    setPurchasing(item.id);
    setError(null);
    setSuccess(null);

    try {
      const newOwnedCosmetics = [...ownedCosmetics, item.id];
      const newCredits = credits - item.price;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          credits: newCredits,
          owned_cosmetics: newOwnedCosmetics,
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      await refreshProfile();
      setSuccess(`${item.name} acheté !`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Purchase error:', err);
      setError(err?.message || "Erreur lors de l'achat");
    } finally {
      setPurchasing(null);
    }
  };

  const handleEquip = async (item: CosmeticItem) => {
    if (!user || !profile) return;
    if (!isOwned(item.id)) return;

    setPurchasing(item.id);
    setError(null);

    try {
      const updateField = item.type === 'badge' ? 'equipped_badge'
        : item.type === 'title' ? 'equipped_title'
        : 'equipped_border';

      const newValue = isEquipped(item) ? null : item.id;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: newValue })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      await refreshProfile();
    } catch (err) {
      console.error('Equip error:', err);
      setError("Erreur lors de l'équipement");
    } finally {
      setPurchasing(null);
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'badges', label: 'Badges', icon: <Sparkles className="w-5 h-5" />, count: BADGES.length },
    { id: 'titles', label: 'Titres', icon: <Crown className="w-5 h-5" />, count: TITLES.length },
    { id: 'borders', label: 'Bordures', icon: <Frame className="w-5 h-5" />, count: BORDERS.length },
  ];

  const getRarityGlow = (rarity: CosmeticItem['rarity']) => {
    switch (rarity) {
      case 'common': return '';
      case 'rare': return 'shadow-[0_0_20px_rgba(59,130,246,0.3)]';
      case 'epic': return 'shadow-[0_0_25px_rgba(168,85,247,0.4)]';
      case 'legendary': return 'shadow-[0_0_30px_rgba(234,179,8,0.5)]';
    }
  };

  const getRarityBorder = (rarity: CosmeticItem['rarity']) => {
    switch (rarity) {
      case 'common': return 'border-zinc-600';
      case 'rare': return 'border-blue-500/50';
      case 'epic': return 'border-purple-500/50';
      case 'legendary': return 'border-yellow-500/50 animate-pulse';
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 mb-4 shadow-2xl shadow-purple-500/30">
            <ShoppingBag className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2">Boutique</h1>
          <p className="text-zinc-400">Flex sur les autres avec des cosmétiques exclusifs</p>

          {/* Balance */}
          <div className="inline-flex items-center gap-3 mt-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-2xl font-black font-mono text-yellow-400">{credits.toLocaleString()}</span>
            <span className="text-yellow-400/70 font-bold">JC</span>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="max-w-md mx-auto mb-6 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="max-w-md mx-auto mb-6 flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex gap-2 p-2 bg-zinc-900/80 rounded-2xl border border-zinc-800">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-zinc-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {getItemsForTab().map(item => {
            const owned = isOwned(item.id);
            const equipped = isEquipped(item);
            const canAfford = credits >= item.price;
            const isLoading = purchasing === item.id;

            return (
              <div
                key={item.id}
                className={`relative group rounded-2xl border-2 transition-all duration-300 overflow-hidden
                  ${getRarityBorder(item.rarity)} ${getRarityGlow(item.rarity)}
                  ${owned ? 'bg-zinc-900/50' : 'bg-zinc-900/80 hover:scale-[1.02]'}
                  ${equipped ? 'ring-2 ring-primary ring-offset-2 ring-offset-zinc-950' : ''}
                `}
              >
                {/* Rarity indicator top bar */}
                <div className={`h-1 ${
                  item.rarity === 'common' ? 'bg-zinc-500' :
                  item.rarity === 'rare' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                  item.rarity === 'epic' ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                  'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600'
                }`} />

                <div className="p-5">
                  {/* Item Icon/Preview */}
                  <div className="flex items-center justify-center h-24 mb-4">
                    {item.type === 'badge' && item.icon && (
                      <div className="text-6xl transform group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                    )}
                    {item.type === 'border' && item.gradient && (
                      <div
                        className="w-20 h-20 rounded-2xl transform group-hover:scale-110 transition-transform"
                        style={{ background: item.gradient }}
                      />
                    )}
                    {item.type === 'title' && (
                      <div className={`text-xl font-black text-center ${getRarityColor(item.rarity)}`}>
                        "{item.name}"
                      </div>
                    )}
                  </div>

                  {/* Item Info */}
                  <div className="text-center mb-4">
                    <div className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-2 ${getRarityBg(item.rarity)} ${getRarityColor(item.rarity)}`}>
                      {getRarityLabel(item.rarity)}
                    </div>
                    <h3 className="font-bold text-white text-lg">{item.name}</h3>
                    <p className="text-sm text-zinc-500 mt-1">{item.description}</p>
                  </div>

                  {/* Price & Actions */}
                  <div className="space-y-3">
                    {owned ? (
                      <>
                        <div className="flex items-center justify-center gap-2 py-2 text-green-400">
                          <Check className="w-5 h-5" />
                          <span className="font-bold">Possédé</span>
                        </div>
                        <button
                          onClick={() => handleEquip(item)}
                          disabled={isLoading}
                          className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                            equipped
                              ? 'bg-primary text-white'
                              : 'bg-zinc-800 text-white hover:bg-zinc-700'
                          }`}
                        >
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : equipped ? (
                            <>
                              <Check className="w-5 h-5" />
                              Équipé
                            </>
                          ) : (
                            'Équiper'
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className={`text-center py-2 font-mono text-xl font-black ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
                          {item.price.toLocaleString()} JC
                        </div>
                        <button
                          onClick={() => handlePurchase(item)}
                          disabled={!canAfford || isLoading || !user}
                          className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                            !user
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              : canAfford
                                ? 'bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 hover:shadow-lg hover:shadow-primary/30'
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : !user ? (
                            <>
                              <Lock className="w-4 h-4" />
                              Connecte-toi
                            </>
                          ) : !canAfford ? (
                            <>
                              <Lock className="w-4 h-4" />
                              Pas assez de JC
                            </>
                          ) : (
                            'Acheter'
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-zinc-500"></div>
            <span className="text-zinc-400">Commun</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-zinc-400">Rare</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-zinc-400">Épique</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
            <span className="text-zinc-400">Légendaire</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
