import React, { useState } from 'react';
import { ShoppingBag, Sparkles, Crown, Frame, Check, Loader2, AlertCircle } from 'lucide-react';
import { useCreditsStore } from '../services/creditsStore';
import { useAuthStore } from '../services/authStore';
import {
  BADGES,
  TITLES,
  BORDERS,
  CosmeticItem,
  CosmeticType,
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
      // Update profile: subtract credits and add to owned cosmetics
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
    } catch (err) {
      console.error('Purchase error:', err);
      setError("Erreur lors de l'achat");
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

      // Toggle: if already equipped, unequip (set to null)
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

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'badges', label: 'Badges', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'titles', label: 'Titres', icon: <Crown className="w-4 h-4" /> },
    { id: 'borders', label: 'Bordures', icon: <Frame className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Boutique</h1>
            <p className="text-zinc-400 text-sm">Personnalise ton profil</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-zinc-400">Tes Johnny Coins</div>
          <div className="text-2xl font-bold text-gold font-mono">{credits.toLocaleString()} JC</div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400">
          <Check className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {getItemsForTab().map(item => {
          const owned = isOwned(item.id);
          const equipped = isEquipped(item);
          const canAfford = credits >= item.price;
          const isLoading = purchasing === item.id;

          return (
            <div
              key={item.id}
              className={`relative p-4 rounded-xl border transition-all ${
                owned
                  ? 'bg-zinc-800/50 border-zinc-700'
                  : getRarityBg(item.rarity)
              } ${equipped ? 'ring-2 ring-primary' : ''}`}
            >
              {/* Rarity badge */}
              <div className={`absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full ${getRarityBg(item.rarity)} ${getRarityColor(item.rarity)}`}>
                {getRarityLabel(item.rarity)}
              </div>

              {/* Item display */}
              <div className="mb-4">
                {item.type === 'badge' && item.icon && (
                  <div className="text-4xl mb-2">{item.icon}</div>
                )}
                {item.type === 'border' && item.gradient && (
                  <div
                    className="w-16 h-16 rounded-xl mb-2"
                    style={{ background: item.gradient }}
                  />
                )}
                {item.type === 'title' && (
                  <div className={`text-lg font-bold mb-2 ${getRarityColor(item.rarity)}`}>
                    "{item.name}"
                  </div>
                )}
                <h3 className="font-bold text-white">{item.name}</h3>
                <p className="text-sm text-zinc-400">{item.description}</p>
              </div>

              {/* Price / Actions */}
              <div className="flex items-center justify-between">
                {owned ? (
                  <span className="text-sm text-green-400 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Possédé
                  </span>
                ) : (
                  <span className={`font-bold font-mono ${canAfford ? 'text-gold' : 'text-red-400'}`}>
                    {item.price.toLocaleString()} JC
                  </span>
                )}

                {owned ? (
                  <button
                    onClick={() => handleEquip(item)}
                    disabled={isLoading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      equipped
                        ? 'bg-primary text-white'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : equipped ? (
                      'Équipé'
                    ) : (
                      'Équiper'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={!canAfford || isLoading}
                    className="px-4 py-2 bg-gradient-to-r from-primary to-accent rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Acheter'
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <h3 className="font-bold text-white mb-2">Comment ça marche ?</h3>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li>• <strong>Badges</strong> s'affichent à côté de ton pseudo</li>
          <li>• <strong>Titres</strong> apparaissent sous ton nom</li>
          <li>• <strong>Bordures</strong> personnalisent ton profil</li>
          <li>• Tu peux équiper un item de chaque type en même temps</li>
        </ul>
      </div>
    </div>
  );
};

export default Shop;
