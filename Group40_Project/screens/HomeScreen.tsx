import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
  Dimensions,
} from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';

import {
  getProductsFromDB,
  deleteProductFromDB,
  seedProducts,
  db,
  removeDuplicateProducts,
} from '../services/db-service';

import { fetchProducts } from '../services/api';
import { getImg } from '../services/images';

import {
  getCloudProducts,
  deleteCloudProduct,
} from '../services/productCloudService';

const screenWidth = Dimensions.get('window').width;
const bannerWidth = screenWidth - 32;

export default function HomeScreen({ navigation, route }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { isAdmin, isGuest, refresh, userName } = route.params || {};

  const bannerRef = useRef<FlatList>(null);
  const [bannerIndex, setBannerIndex] = useState(0);

  const banners = [
    { id: '1', image: getImg('denim'), title: 'New arrival!' },
    { id: '2', image: getImg('shirt'), title: 'Best Seller!' },
    { id: '3', image: getImg('phone'), title: 'You do not want to miss out!' },
    { id: '4', image: getImg('gun'), title: 'Get them right now!' },
  ];

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showSort, setShowSort] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');

  const categories = ['All', 'Fashion', 'Electronics', 'Home', 'Toys', 'Others'];

  const filteredProducts = items
    .filter(item => {
      const matchesSearch = item.title
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'nameAsc':
          return a.title.localeCompare(b.title);

        case 'nameDesc':
          return b.title.localeCompare(a.title);

        case 'priceAsc':
          return Number(a.price) - Number(b.price);

        case 'priceDesc':
          return Number(b.price) - Number(a.price);

        case 'soldAsc':
          return Number(a.sold || 0) - Number(b.sold || 0);

        case 'soldDesc':
          return Number(b.sold || 0) - Number(a.sold || 0);

        default:
          return 0;
      }
    });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

  const PageControls = () => (
    <View style={s.paginationContainer}>
      <TouchableOpacity
        disabled={currentPage === 1}
        onPress={() => setCurrentPage(prev => prev - 1)}
        style={[s.pageBtn, currentPage === 1 && s.disabledBtn]}
      >
        <Icon
          name="chevron-back"
          size={20}
          color={currentPage === 1 ? '#ccc' : '#3498db'}
        />
      </TouchableOpacity>

      <Text style={s.pageInfo}>
        Page {currentPage} of {totalPages || 1}
      </Text>

      <TouchableOpacity
        disabled={currentPage === totalPages || totalPages === 0}
        onPress={() => setCurrentPage(prev => prev + 1)}
        style={[
          s.pageBtn,
          (currentPage === totalPages || totalPages === 0) && s.disabledBtn,
        ]}
      >
        <Icon
          name="chevron-forward"
          size={20}
          color={
            currentPage === totalPages || totalPages === 0
              ? '#ccc'
              : '#3498db'
          }
        />
      </TouchableOpacity>
    </View>
  );

  useEffect(() => {
    navigation.setOptions({
      headerTitle: isAdmin ? 'Inventory Editing' : 'Monarch Store',

      headerRight: () => (
        <View style={s.headerRight}>
          {showSearch ? (
            <>
              <TextInput
                autoFocus
                placeholder="Search..."
                value={searchQuery}
                onChangeText={text => {
                  setSearchQuery(text);
                  setCurrentPage(1);
                }}
                style={s.headerSearchInput}
              />

              <TouchableOpacity
                onPress={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
              >
                <Icon name="close-circle-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={s.headerIconRow}>
              <TouchableOpacity
                onPress={() => setShowSort(!showSort)}
                style={s.headerIconBtn}
              >
                <Icon name="filter-outline" size={23} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowSearch(true)}
                style={s.headerIconBtn}
              >
                <Icon name="search-outline" size={23} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ),
    });
  }, [navigation, isAdmin, showSearch, searchQuery, showSort]);

  useEffect(() => {
    const syncCloudProductsToSQLite = (cloudProducts: any[]) => {
      return new Promise<void>((resolve) => {
        const cloudIds = cloudProducts
          .map((p: any) => p.cloudId || p.id || p._id || p.productId)
          .filter((id: any) => id !== undefined && id !== null && id !== '');

        db.transaction(
          (tx: any) => {
            if (cloudIds.length > 0) {
              tx.executeSql(
                `DELETE FROM Products 
             WHERE firebaseId IS NOT NULL 
             AND firebaseId NOT IN (${cloudIds.map(() => '?').join(',')})`,
                cloudIds,
                () => console.log('Deleted local cloud products that no longer exist in cloud'),
                (_: any, err: any) => {
                  console.log('Delete sync error:', err.message);
                  return false;
                }
              );
            }

            cloudProducts.forEach((p: any) => {
              const cloudId = p.cloudId || p.id || p._id || p.productId;

              if (!cloudId) {
                console.log('Skipped cloud product because no id:', p);
                return;
              }

              tx.executeSql(
                `
            INSERT OR REPLACE INTO Products
            (id, title, price, stock, category, seller, description, image, firebaseId, sold)
            VALUES (
              COALESCE(
                (SELECT id FROM Products WHERE firebaseId = ?),
                (SELECT id FROM Products WHERE title = ? AND seller = ? AND firebaseId IS NULL)
              ),
              ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            `,
                [
                  cloudId,
                  p.title,
                  p.seller || 'Admin',

                  p.title || 'Untitled Product',
                  Number(p.price) || 0,
                  Number(p.stock) || 0,
                  p.category || 'Others',
                  p.seller || 'Admin',
                  p.description || '',
                  p.image || 'p1',
                  cloudId,
                  Number(p.sold) || 0,
                ],
                () => { },
                (_: any, err: any) => {
                  console.log('Upsert cloud product error:', err.message);
                  return false;
                }
              );
            });
          },
          (err: any) => {
            console.log('Cloud sync transaction error:', err);
            resolve();
          },
          () => {
            console.log('Cloud products synced to SQLite');
            resolve();
          }
        );
      });
    };

    const loadLocalOrInitialProducts = async () => {
      getProductsFromDB(async (localData: any[]) => {
        if (localData.length > 0) {
          setItems(localData);
          setLoading(false);
          console.log('Loaded from SQLite fallback:', localData.length);
        } else {
          const initialData = await fetchProducts();

          seedProducts(initialData);

          setTimeout(() => {
            getProductsFromDB((seededData: any[]) => {
              setItems(seededData);
              setLoading(false);
              console.log('Loaded initialItems fallback:', seededData.length);
            });
          }, 300);
        }
      });
    };

    const load = async () => {
      setLoading(true);

      try {
        removeDuplicateProducts();

        const cloudProducts = await getCloudProducts();
        console.log(`Cloud API loaded: ${cloudProducts.length} products`);
        console.log('Cloud products:', cloudProducts);

        if (cloudProducts && cloudProducts.length > 0) {
          await syncCloudProductsToSQLite(cloudProducts);

          getProductsFromDB((updatedLocalData: any[]) => {
            setItems(updatedLocalData);
            setLoading(false);
            console.log(
              'Displayed Firebase-synced SQLite:',
              updatedLocalData.length
            );
          });

          return;
        }

        console.log('Firebase has no products, using SQLite or initialItems');
        await loadLocalOrInitialProducts();
      } catch (cloudError) {
        console.log('Firebase unavailable, using SQLite fallback:', cloudError);
        await loadLocalOrInitialProducts();
      }
    };

    const sub = navigation.addListener('focus', load);
    load();

    return sub;
  }, [navigation, isAdmin, refresh]);

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
    Alert.alert('Delete', `Remove ${name}?`, [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteProductFromDB(id, () => {
            getProductsFromDB((data: any) => setItems(data));
          });

          const product = items.find((item: any) => item.id === id);

          if (product?.firebaseId) {
            deleteCloudProduct(product.firebaseId)
              .then(() => console.log('Cloud product deleted'))
              .catch(err => console.log('Cloud delete failed:', err));
          }
        },
      },
    ]);
  };

  const getImageSource = (image: string) => {
    if (
      typeof image === 'string' &&
      (image.startsWith('http') || image.startsWith('file'))
    ) {
      return { uri: image };
    }

    return getImg(image || 'p1');
  };

  const SortDropdown = () => (
    <View style={s.sortDropdown}>
      <Text style={s.sortTitle}>Sort Products</Text>

      <TouchableOpacity
        style={s.sortOption}
        onPress={() => {
          setSortBy('nameAsc');
          setShowSort(false);
        }}
      >
        <Icon name="text-outline" size={17} color="#3498db" />
        <Text style={s.sortOptionText}>Name A → Z</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.sortOption}
        onPress={() => {
          setSortBy('nameDesc');
          setShowSort(false);
        }}
      >
        <Icon name="text-outline" size={17} color="#3498db" />
        <Text style={s.sortOptionText}>Name Z → A</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.sortOption}
        onPress={() => {
          setSortBy('priceAsc');
          setShowSort(false);
        }}
      >
        <Icon name="arrow-up-outline" size={17} color="#3498db" />
        <Text style={s.sortOptionText}>Price Low → High</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.sortOption}
        onPress={() => {
          setSortBy('priceDesc');
          setShowSort(false);
        }}
      >
        <Icon name="arrow-down-outline" size={17} color="#3498db" />
        <Text style={s.sortOptionText}>Price High → Low</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.sortOption}
        onPress={() => {
          setSortBy('soldDesc');
          setShowSort(false);
        }}
      >
        <Icon name="flame-outline" size={17} color="#3498db" />
        <Text style={s.sortOptionText}>Sold High → Low</Text>
      </TouchableOpacity>
    </View>
  );

  const ProductListHeader = () => (
    <>
      <View style={s.bannerArea}>
        <FlatList
          ref={bannerRef}
          data={banners}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          getItemLayout={(_, index) => ({
            length: bannerWidth,
            offset: bannerWidth * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              bannerRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
              });
            }, 300);
          }}
          renderItem={({ item }) => (
            <View style={s.banner}>
              <Image source={item.image} style={s.bannerImg} />
              <View style={s.overlay} />

              <View style={s.bannerContent}>
                <Text style={s.bannerSmallText}>Monarch Store</Text>
                <Text style={s.bannerText}>{item.title}</Text>
              </View>
            </View>
          )}
        />
      </View>

      <View style={s.categorySection}>
        <View style={s.sectionTitleRow}>
          <Text style={s.sectionTitle}>Categories</Text>

          <Text style={s.resultCount}>
            {filteredProducts.length} item{filteredProducts.length === 1 ? '' : 's'}
          </Text>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          contentContainerStyle={s.catContent}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.catPill, selectedCategory === item && s.activePill]}
              onPress={() => {
                setSelectedCategory(item);
                setCurrentPage(1);
              }}
            >
              <Text
                style={[
                  s.catText,
                  selectedCategory === item && s.activeCatText,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={s.loadingPage}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={s.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={s.page}>
      {showSort && <SortDropdown />}

      <FlatList
        data={currentItems}
        ListHeaderComponent={<ProductListHeader />}
        ListFooterComponent={<PageControls />}
        keyExtractor={(i: any) => i.id.toString()}
        getItemLayout={(data, index) => ({
          length: 128,
          offset: 128 * index,
          index,
        })}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        renderItem={({ item }: any) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('Details', {
                product: item,
                isAdmin,
                isGuest,
                userName,
              })
            }
          >
            <View style={s.row}>
              <Image source={getImageSource(item.image)} style={s.img} />

              <View style={s.info}>
                <Text style={s.name} numberOfLines={2}>
                  {item.title}
                </Text>

                <Text style={s.price}>
                  RM {Number(item.price || 0).toFixed(2)}
                </Text>

                {isAdmin ? (
                  <View style={s.adminRow}>
                    <View style={s.statsContainer}>
                      <View style={s.miniTagOrange}>
                        <Text style={s.miniTagTextOrange}>
                          Stock: {item.stock}
                        </Text>
                      </View>

                      <View style={s.miniTagGreen}>
                        <Text style={s.miniTagTextGreen}>
                          Sold: {item.sold || 0}
                        </Text>
                      </View>
                    </View>

                    <View style={s.actionButtonGroup}>
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate('AdminEdit', { product: item })
                        }
                        style={[s.actionBtn, s.editBtn]}
                      >
                        <Icon name="create-outline" size={14} color="#fff" />
                        <Text style={s.actionTxt}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => confirmRemoval(item.id, item.title)}
                        style={[s.actionBtn, s.deleteBtn]}
                      >
                        <Icon name="trash-outline" size={14} color="#fff" />
                        <Text style={s.actionTxt}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={s.userInfoRow}>
                    <View
                      style={[
                        s.stockTag,
                        Number(item.stock) < 10 && s.lowStockTag,
                      ]}
                    >
                      <Text
                        style={[
                          s.stockTagText,
                          Number(item.stock) < 5 && s.veryLowStockText,
                        ]}
                        numberOfLines={1}
                      >
                        Stock: {item.stock}
                      </Text>
                    </View>

                    <Text style={s.userSold} numberOfLines={1}>
                      Sold: {item.sold || 0}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Icon name="cube-outline" size={48} color="#bdc3c7" />
            <Text style={s.emptyHint}>No products found.</Text>
          </View>
        }
      />

      {isAdmin && (
        <TouchableOpacity
          style={s.fab}
          onPress={() => navigation.navigate('AdminAdd')}
        >
          <Icon name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  loadingPage: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    color: '#7f8c8d',
    fontWeight: '600',
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },

  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerIconBtn: {
    marginLeft: 12,
  },

  headerSearchInput: {
    width: 205,
    height: 38,
    backgroundColor: '#fff',
    borderRadius: 19,
    paddingHorizontal: 13,
    fontSize: 13,
    marginRight: 8,
    color: '#2c3e50',
  },

  bannerArea: {
    backgroundColor: '#f5f7fa',
    paddingTop: 12,
    paddingBottom: 6,
  },

  banner: {
    width: bannerWidth,
    height: 170,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    overflow: 'hidden',
    backgroundColor: '#3498db',
  },

  bannerImg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },

  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.32)',
  },

  bannerContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 22,
  },

  bannerSmallText: {
    color: '#ecf0f1',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },

  bannerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },

  categorySection: {
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#f5f7fa',
  },

  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 10,
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2c3e50',
  },

  resultCount: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
  },

  catContent: {
    paddingLeft: 16,
    paddingRight: 16,
    alignItems: 'center',
  },

  catPill: {
    minWidth: 88,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },

  activePill: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },

  catText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },

  activeCatText: {
    color: '#fff',
  },

  row: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 7,
    backgroundColor: '#fff',
    borderRadius: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    minHeight: 114,
  },

  img: {
    width: 82,
    height: 82,
    borderRadius: 14,
    backgroundColor: '#ecf0f1',
  },

  info: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },

  name: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2c3e50',
  },

  price: {
    color: '#3498db',
    marginTop: 3,
    fontWeight: 'bold',
    fontSize: 15,
  },

  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  statsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },

  miniTagOrange: {
    backgroundColor: '#fff7ed',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },

  miniTagTextOrange: {
    color: '#e67e22',
    fontSize: 11,
    fontWeight: '800',
  },

  miniTagGreen: {
    backgroundColor: '#ecfdf5',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },

  miniTagTextGreen: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '800',
  },

  actionButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 7,
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },

  editBtn: {
    backgroundColor: '#3498db',
  },

  deleteBtn: {
    backgroundColor: '#e74c3c',
  },

  actionTxt: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  userInfoRow: {
    marginTop: 5,
  },

  stockTag: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    alignSelf: 'flex-start',
  },

  lowStockTag: {
    backgroundColor: '#fee2e2',
  },

  stockTagText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '700',
  },

  veryLowStockText: {
    color: '#dc2626',
  },

  userSold: {
    marginTop: 5,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },

  fab: {
    position: 'absolute',
    bottom: 22,
    right: 22,
    backgroundColor: '#3498db',
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 7,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 22,
    backgroundColor: '#f5f7fa',
  },

  pageBtn: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    marginHorizontal: 15,
  },

  disabledBtn: {
    backgroundColor: '#f1f1f1',
    elevation: 0,
  },

  pageInfo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },

  sortDropdown: {
    position: 'absolute',
    top: 8,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    width: 205,
    zIndex: 999,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  sortTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2c3e50',
    paddingHorizontal: 14,
    paddingBottom: 6,
  },

  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 9,
  },

  sortOptionText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },

  emptyBox: {
    alignItems: 'center',
    marginTop: 50,
  },

  emptyHint: {
    textAlign: 'center',
    marginTop: 10,
    color: '#999',
    fontWeight: '600',
  },
});