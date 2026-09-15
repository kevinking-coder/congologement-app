import { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { SlidersHorizontalIcon, XIcon } from 'lucide-react-native';
import { cssInterop, useColorScheme } from 'nativewind';
import { useApp } from '@/src/providers/AppProvider';
import { type Listing } from '@/src/db/types';
import { COMMUNES, CATEGORY_LABELS, BUY_PROPERTY_TYPES, RENT_PROPERTY_TYPES } from '@/src/lib/listing-utils';
import { useCurrency } from '@/src/lib/currency-context';
import { ListingCard } from '@/src/components/ListingCard';

cssInterop(SlidersHorizontalIcon, { className: { target: 'style', nativeStyleToProp: { color: true } } });
cssInterop(XIcon, { className: { target: 'style', nativeStyleToProp: { color: true } } });

type Category = 'buy' | 'rent' | 'hotel';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'buy', label: 'Acheter' },
  { key: 'rent', label: 'Louer' },
  { key: 'hotel', label: 'Hôtels' },
];

const ADULT_OPTIONS = ['1', '2', '3', '4+'];
const CHILDREN_OPTIONS = ['1', '2', '3', '4+'];
const STAR_OPTIONS = ['Any', '3+', '4+', '5'];

export default function ExplorerScreen() {
  const { client } = useApp();
  const { currency } = useCurrency();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const ph = isDark ? '#8aa0b8' : '#9aa3b2';
  const params = useLocalSearchParams<{ category?: string }>();

  const initialCategory: Category =
    params.category === 'buy' || params.category === 'rent' || params.category === 'hotel'
      ? params.category
      : 'buy';

  const [category, setCategory] = useState<Category>(initialCategory);
  const [commune, setCommune] = useState<string>('');
  const [propertyType, setPropertyType] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minBedrooms, setMinBedrooms] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'price'>('date');
  const [showFilters, setShowFilters] = useState(false);

  // Hotel filters
  const [adults, setAdults] = useState<string>('');
  const [withChildren, setWithChildren] = useState(false);
  const [children, setChildren] = useState<string>('');
  const [starsFilter, setStarsFilter] = useState<string>('');
  const [arrival, setArrival] = useState<string>('');
  const [departure, setDeparture] = useState<string>('');
  const [dateError, setDateError] = useState('');

  const { data: all = [], isLoading } = useQuery({
    queryKey: ['listings', 'all'],
    queryFn: async () => {
      const { data, error } = await client.from('listings').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as Listing[];
    },
  });

  const results = useMemo(() => {
    let list = all.filter((l) => l.category === category);

    if (commune) list = list.filter((l) => l.commune === commune);
    if (propertyType) list = list.filter((l) => l.property_type === propertyType);
    if (verifiedOnly) list = list.filter((l) => l.verified);

    const min = minPrice ? parseFloat(minPrice) : null;
    const max = maxPrice ? parseFloat(maxPrice) : null;
    if (min != null || max != null) {
      list = list.filter((l) => {
        const p = l.category === 'hotel' ? (l.price_per_night_usd ?? 0) : l.prix_usd;
        if (min != null && p < min) return false;
        if (max != null && p > max) return false;
        return true;
      });
    }

    if (category === 'buy' || category === 'rent') {
      const minBeds = minBedrooms ? parseInt(minBedrooms, 10) : null;
      if (minBeds != null) list = list.filter((l) => (l.bedrooms ?? 0) >= minBeds);
    }

    // Hotel guest filtering
    if (category === 'hotel') {
      if (adults) {
        const needAdult = adults === '4+' ? 4 : parseInt(adults, 10);
        list = list.filter((l) => (l.max_adults ?? 0) >= needAdult);
      }
      if (withChildren && children) {
        const needChild = children === '4+' ? 4 : parseInt(children, 10);
        list = list.filter((l) => l.children_allowed === true && (l.max_children ?? 0) >= needChild);
      }
      if (starsFilter && starsFilter !== 'Any') {
        const minStars = parseInt(starsFilter, 10);
        list = list.filter((l) => (l.stars ?? 0) >= minStars);
      }
    }

    if (sortBy === 'price') {
      list = [...list].sort((a, b) => {
        const pa = a.category === 'hotel' ? (a.price_per_night_usd ?? 0) : a.prix_usd;
        const pb = b.category === 'hotel' ? (b.price_per_night_usd ?? 0) : b.prix_usd;
        return pa - pb;
      });
    }
    return list;
  }, [
    all, category, commune, propertyType, minPrice, maxPrice, minBedrooms, verifiedOnly, sortBy,
    adults, withChildren, children, starsFilter,
  ]);

  const showPropertyFilters = category === 'buy' || category === 'rent';
  const propertyTypes = category === 'buy' ? BUY_PROPERTY_TYPES : RENT_PROPERTY_TYPES;

  const setDateField = (field: 'arrival' | 'departure', value: string) => {
    if (field === 'arrival') setArrival(value);
    else setDeparture(value);
    // Validate departure after arrival
    if (field === 'arrival') {
      if (departure && value && departure <= value) setDateError('La date de départ doit être après la date d’arrivée.');
      else setDateError('');
    } else {
      if (arrival && value && value <= arrival) setDateError('La date de départ doit être après la date d’arrivée.');
      else setDateError('');
    }
  };

  const resetFilters = () => {
    setCommune('');
    setPropertyType('');
    setMinPrice('');
    setMaxPrice('');
    setMinBedrooms('');
    setVerifiedOnly(false);
    setAdults('');
    setWithChildren(false);
    setChildren('');
    setStarsFilter('');
    setArrival('');
    setDeparture('');
    setDateError('');
  };

  const isHotel = category === 'hotel';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="px-5 pt-3 pb-3">
        <Text className="text-2xl font-bold text-foreground tracking-tight">Explorer</Text>
      </View>

      {/* Category selector */}
      <View className="px-5 mb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <Pressable
                key={c.key}
                onPress={() => setCategory(c.key)}
                className={`rounded-full px-4 py-2 ${active ? 'bg-primary' : 'bg-card border border-border'}`}
              >
                <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-foreground'}`}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter + sort bar */}
      <View className="flex-row items-center gap-2 px-5 pb-3">
        <Pressable
          onPress={() => setShowFilters((s) => !s)}
          className={`flex-row items-center gap-1.5 rounded-xl px-3 py-2 ${showFilters ? 'bg-primary' : 'bg-card border border-border'}`}
        >
          <SlidersHorizontalIcon className={showFilters ? 'text-white' : 'text-foreground'} size={15} />
          <Text className={`text-sm font-medium ${showFilters ? 'text-white' : 'text-foreground'}`}>Filtres</Text>
        </Pressable>
        <View className="flex-1" />
        <Pressable onPress={() => setSortBy((s) => (s === 'date' ? 'price' : 'date'))} className="rounded-xl px-3 py-2 bg-card border border-border">
          <Text className="text-sm font-medium text-foreground">{sortBy === 'date' ? 'Plus récents' : 'Prix croissant'}</Text>
        </Pressable>
      </View>

      {/* Filters panel */}
      {showFilters && (
        <View className="mx-5 mb-3 bg-card rounded-2xl p-4 gap-3 border border-border">
          <Text className="text-sm font-semibold text-foreground">Commune</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {COMMUNES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCommune(commune === c ? '' : c)}
                className={`rounded-full px-3 py-1.5 ${commune === c ? 'bg-accent' : 'bg-muted'}`}
              >
                <Text className={`text-xs font-medium ${commune === c ? 'text-accent-foreground' : 'text-foreground'}`}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Type de bien for buy/rent */}
          {showPropertyFilters && (
            <>
              <Text className="text-sm font-semibold text-foreground">Type de bien</Text>
              <View className="flex-row flex-wrap gap-2">
                {propertyTypes.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setPropertyType(propertyType === t ? '' : t)}
                    className={`rounded-lg px-3 py-1.5 ${propertyType === t ? 'bg-accent' : 'bg-muted'}`}
                  >
                    <Text className={`text-xs font-medium ${propertyType === t ? 'text-accent-foreground' : 'text-foreground'}`}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* Hotel arrival/departure dates */}
          {isHotel && (
            <>
              <Text className="text-sm font-semibold text-foreground">Date d’arrivée</Text>
              <TextInput
                value={arrival}
                onChangeText={(v) => setDateField('arrival', v)}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={ph}
                className="bg-muted rounded-lg px-3 py-2 text-foreground"
              />
              <Text className="text-sm font-semibold text-foreground">Date de départ</Text>
              <TextInput
                value={departure}
                onChangeText={(v) => setDateField('departure', v)}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={ph}
                className="bg-muted rounded-lg px-3 py-2 text-foreground"
              />
              {dateError ? <Text className="text-destructive text-xs">{dateError}</Text> : null}
            </>
          )}

          {/* Hotel guest filtering */}
          {isHotel && (
            <>
              <Text className="text-sm font-semibold text-foreground">Nombre d’adultes</Text>
              <View className="flex-row gap-2 flex-wrap">
                {ADULT_OPTIONS.map((a) => (
                  <Pressable
                    key={a}
                    onPress={() => setAdults(adults === a ? '' : a)}
                    className={`rounded-lg px-3 py-1.5 ${adults === a ? 'bg-accent' : 'bg-muted'}`}
                  >
                    <Text className={`text-xs font-medium ${adults === a ? 'text-accent-foreground' : 'text-foreground'}`}>{a}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={() => { setWithChildren((v) => !v); if (withChildren) setChildren(''); }} className="flex-row items-center gap-2">
                <View className={`w-5 h-5 rounded ${withChildren ? 'bg-primary' : 'border border-border bg-transparent'} items-center justify-center`}>
                  {withChildren && <XIcon className="text-white" size={12} />}
                </View>
                <Text className="text-sm text-foreground">Voyagez-vous avec des enfants ?</Text>
              </Pressable>

              {withChildren && (
                <>
                  <Text className="text-sm font-semibold text-foreground">Nombre d’enfants</Text>
                  <View className="flex-row gap-2 flex-wrap">
                    {CHILDREN_OPTIONS.map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => setChildren(children === c ? '' : c)}
                        className={`rounded-lg px-3 py-1.5 ${children === c ? 'bg-accent' : 'bg-muted'}`}
                      >
                        <Text className={`text-xs font-medium ${children === c ? 'text-accent-foreground' : 'text-foreground'}`}>{c}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          {/* Price */}
          <Text className="text-sm font-semibold text-foreground">Prix (USD)</Text>
          <View className="flex-row gap-2">
            <TextInput
              value={minPrice}
              onChangeText={setMinPrice}
              placeholder="Min"
              keyboardType="numeric"
              placeholderTextColor={ph}
              className="flex-1 bg-muted rounded-lg px-3 py-2 text-foreground"
            />
            <TextInput
              value={maxPrice}
              onChangeText={setMaxPrice}
              placeholder="Max"
              keyboardType="numeric"
              placeholderTextColor={ph}
              className="flex-1 bg-muted rounded-lg px-3 py-2 text-foreground"
            />
          </View>

          {/* Bedrooms for residential buy/rent */}
          {category === 'buy' && (
            <>
              <Text className="text-sm font-semibold text-foreground">Chambres (min)</Text>
              <TextInput
                value={minBedrooms}
                onChangeText={setMinBedrooms}
                placeholder="Ex: 2"
                keyboardType="numeric"
                placeholderTextColor={ph}
                className="bg-muted rounded-lg px-3 py-2 text-foreground"
              />
            </>
          )}

          {/* Star rating filter for hotels */}
          {isHotel && (
            <>
              <Text className="text-sm font-semibold text-foreground">Classement</Text>
              <View className="flex-row gap-2 flex-wrap">
                {STAR_OPTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setStarsFilter(starsFilter === s ? '' : s)}
                    className={`rounded-lg px-3 py-1.5 ${starsFilter === s ? 'bg-accent' : 'bg-muted'}`}
                  >
                    <Text className={`text-xs font-medium ${starsFilter === s ? 'text-accent-foreground' : 'text-foreground'}`}>
                      {s === 'Any' ? 'Tous' : `${s} étoiles`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Pressable onPress={() => setVerifiedOnly((v) => !v)} className="flex-row items-center gap-2">
            <View className={`w-5 h-5 rounded border ${verifiedOnly ? 'bg-primary border-primary' : 'border-border bg-transparent'} items-center justify-center`}>
              {verifiedOnly && <XIcon className="text-white" size={12} />}
            </View>
            <Text className="text-sm text-foreground">Vérifié uniquement</Text>
          </Pressable>

          {(commune || propertyType || minPrice || maxPrice || minBedrooms || verifiedOnly || adults || withChildren || children || starsFilter || arrival || departure) && (
            <Pressable onPress={resetFilters}>
              <Text className="text-primary text-sm font-semibold">Réinitialiser les filtres</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Results */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={isDark ? '#b8860b' : '#0e7490'} />
          <Text className="text-muted-foreground text-sm mt-3">Recherche en cours…</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 14 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ListingCard listing={item} currency={currency} arrival={arrival} departure={departure} />
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-16 px-6">
              <Text className="text-foreground text-base font-semibold">Aucun résultat</Text>
              <Text className="text-muted-foreground text-sm text-center mt-2">
                Aucune annonce ne correspond à vos critères. Essayez d'élargir vos filtres.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
