import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert, TextInput, ImageBackground } from 'react-native';
import { getProductsFromDB, deleteProductFromDB, initDB, seedProducts } from '../services/db-service';
import { fetchProducts } from '../services/api';
import { getImg } from '../services/images';
import Icon from 'react-native-vector-icons/Ionicons';
import { getProductsFromFirebase } from '../services/firebase-services';
import { Picker } from '@react-native-picker/picker';
export default function HomeScreen({ navigation, route }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isGuest } = route.params || {};
  const bannerRef = useRef<FlatList>(null);
  const [bannerIndex, setBannerIndex] = useState(0);

  const banners = [
    { id: '1', image: getImg('denim'), title: 'New arrival!' },
    { id: '2', image: getImg('shirt'), title: 'Best Seller!' },
    { id: '3', image: getImg('phone'), title: 'You dont want to miss out!' },
    { id: '4', image: getImg('gun'), title: 'Get em right now!' },
  ];
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [sortBy, setSortBy] = useState('none');

  const categories = ['All', 'Fashion', 'Electronics', 'Home', 'Toys', 'Others'];
  const filteredProducts = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  })
  items.sort((a,b) => {
    if (sortBy === 'priceAsc') {
      return a.price - b.price;
    } else if (sortBy === 'priceDesc') {
      return b.price - a.price;
    }
    return 0;
  });

  useEffect(() => {
    navigation.setOptions({
      headerTitle: isAdmin ? "Inventory Editing" : "Monarch Store",

      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
          {showSearch ? (
            <>
              <TextInput
                autoFocus
                placeholder="Search..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  width: 190,
                  height: 34,
                  backgroundColor: '#f1f3f4',
                  borderRadius: 17,
                  paddingHorizontal: 12,
                  fontSize: 13,
                  marginRight: 8,
                }}
              />

              <TouchableOpacity
                onPress={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
              >
                <Icon name="close" size={22} color="#333" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setShowSearch(true)}>
              <Icon name="search" size={22} color="#333" />
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [navigation, isAdmin, showSearch, searchQuery]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const raw = await fetchProducts();
        seedProducts(raw);
        let localProducts: any[] = [];

        // Get SQLite products
        getProductsFromDB(async (localData: any[]) => {
          localProducts = localData;
          try {
            // product from firebase 
            const firebaseProducts = await getProductsFromFirebase();
            //merge sqlite and firebase
            const mergedProducts = [...localProducts, ...firebaseProducts];
            //Remove duplicates 
            const uniqueProducts = mergedProducts.filter(
              (item, index, self) =>
                index === self.findIndex(p => p.title === item.title)
            );

            setItems(uniqueProducts);
            setLoading(false);
          } catch (firebaseError) {
            console.log("Firebase load failed:", firebaseError);
            // if Firebase fails, still show SQLite
            setItems(localProducts);
            setLoading(false);
          }
        });
      } catch (error) {
        console.log("Product load failed:", error);
        setLoading(false);
      }
    };

    const sub = navigation.addListener('focus', load);
    load();

    return sub;
  }, [navigation, isAdmin]);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (bannerIndex + 1) % banners.length;
      setBannerIndex(nextIndex);

      bannerRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [bannerIndex]);
  const confirmRemoval = (id: number, name: string) => {
    Alert.alert("Delete", `Remove ${name}?`, [
      { text: "Cancel" },
      {
        text: "Delete",
        onPress: () => {
          deleteProductFromDB(id, () => {
            getProductsFromDB((data: any) => setItems(data));
          });
        }
      }
    ]);
  };
  console.log('Current Category:', selectedCategory);
  console.log('First Item Category:', items[0]?.category);
  const getImageSource = (image: string) => {
    if (typeof image === 'string' && (image.startsWith('http') || image.startsWith('file'))) {
      return { uri: image };
    }

    return getImg(image || 'p1');
  };
  return (
    <View style={s.page}>
      {/* 1. 搜索框和分类按钮放在列表头部 */}
      <View style={s.headerArea}>
        <View style={s.pickerContainer}>
          <Text style={s.pickerLabel}>Sort By:</Text>
          <Picker
            selectedValue={sortBy}
            onValueChange={(itemValue) => setSortBy(itemValue)}
            style={s.picker}
          >
            <Picker.Item label="Default" value="none" />
            <Picker.Item label="Price: Low to High" value="priceAsc" />
            <Picker.Item label="Price: High to Low" value="priceDesc" />
            <Picker.Item label="Top Selling" value="sales" />
          </Picker>
        </View>
        <FlatList
          ref={bannerRef}
          data={banners}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={s.banner}>
              <Image source={item.image} style={s.bannerImg} />
              <View style={s.overlay} />
              <Text style={s.bannerText}>{item.title}</Text>
            </View>
          )}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.catPill, selectedCategory === item && s.activePill]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[s.catText, selectedCategory === item && s.activeCatText]}>{item}</Text>
            </TouchableOpacity>
          )}
          style={s.catList}
        />
      </View>

      {/* 2. 商品列表 - 注意 data 换成了 filteredData */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(i: any) => i.id.toString()}
        renderItem={({ item }: any) => (
          <TouchableOpacity onPress={() => navigation.navigate('Details', { product: item, isAdmin, isGuest })}>
            <View style={s.row}>
              <Image source={getImageSource(item.image)} style={s.img} />
              <View style={s.info}>
                <Text style={s.name}>{item.title}</Text>
                <Text style={s.price}>RM {item.price.toFixed(2)}</Text>
                {isAdmin ? (
                  <View style={s.adminRow}>
                    <Text style={s.stock}>STOCK: {item.stock}</Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('AdminEdit', { product: item })}
                      style={[s.del, { backgroundColor: '#3498db', marginRight: 10 }]}>
                      <Text style={s.delTxt}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmRemoval(item.id, item.title)} style={s.del}>
                      <Text style={s.delTxt}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ) : <View
                  style={[
                    s.stockTag,
                    item.stock < 10 && { backgroundColor: '#fee2e2' }
                  ]}
                >
                  <Text
                    style={[
                      s.stockTagText,
                      item.stock < 5 && { color: '#dc2626' }
                    ]}
                  >
                    Stock: {item.stock}
                  </Text>
                </View>}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.emptyHint}>No products found.</Text>}
      />

      {isAdmin && (
        <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('AdminAdd')}>
          <Text style={s.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  row: {
    flexDirection: 'row',
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    elevation: 2,
  },
  img: { width: 75, height: 75, borderRadius: 8 },
  info: { flex: 1, marginLeft: 15 },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#070707',
  },

  price: {
    color: '#3498db',
    marginTop: 4,
    fontWeight: 'bold',
    fontSize: 15,
  },
  adminRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  stock: { fontWeight: 'bold', color: '#e67e22' },
  userStock: { fontSize: 12, color: '#7f8c8d' },
  del: { backgroundColor: '#e74c3c', padding: 5, borderRadius: 4 },
  delTxt: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#3498db', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  fabIcon: { color: '#fff', fontSize: 24 },
  headerArea: {
    backgroundColor: '#fff',
    paddingBottom: 10,
    elevation: 2,
  },

  catList: {
    paddingLeft: 15,
  },
  catPill: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#eee',
    marginRight: 10,
  },
  activePill: {
    backgroundColor: '#3498db',
  },
  catText: {
    color: '#666',
    fontSize: 13,
  },
  activeCatText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyHint: {
    textAlign: 'center',
    marginTop: 50,
    color: '#999',
  },
  banner: {
    width: 360,
    height: 120,
    backgroundColor: '#3498db',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  bannerImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
  },
  bannerText: {
    color: '#e8ebf0',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 20,

  },
  stockTag: {
    marginTop: 6,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },

  stockTagText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '600',
  },

  searchBar: {
    marginHorizontal: 15,
    marginTop: 10,
    backgroundColor: '#f1f3f4',
    paddingHorizontal: 15,
    height: 40,
    borderRadius: 20,
    fontSize: 14,
  },

pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  pickerLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  picker: {
    flex: 1,
    height: 50,
    color: '#3498db'
  },
});