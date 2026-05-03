import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';

import { addToCart, checkStock } from '../services/db-service';
import { getImg } from '../services/images';

export default function DetailScreen({ route, navigation }: any) {
  const { product, isAdmin, isGuest, userName } = route.params || {};

  const [qty, setQty] = useState(1);
  const [modal, setModal] = useState(false);

  const getImageSource = (image: string) => {
    if (
      typeof image === 'string' &&
      (image.startsWith('http') || image.startsWith('file'))
    ) {
      return { uri: image };
    }

    return getImg(image || 'p1');
  };

  const onAdd = () => {
    if (isGuest) {
      setModal(true);
      return;
    }
    if (!userName) {
      Alert.alert('Error', 'User information is missing. Please login again.');
      return;
    }

    checkStock(product.id, currentStock => {
      if (currentStock <= 0) {
        Alert.alert('Out of Stock', 'This item is sold out!');
        return;
      }

      if (qty > currentStock) {
        Alert.alert('Insufficient Stock', `Only ${currentStock} items left.`);
        return;
      }

      addToCart(product, qty, userName, (response: any) => {
        if (!response?.success) {
          Alert.alert('Error', 'Failed to add item to cart.');
          return;
        }

        navigation.getParent()?.getParent()?.setParams({
      refresh: Date.now(),
        });

        Alert.alert('Success', 'Added to your cart!', [
          {
            text: 'Continue Shopping',
            onPress: () => navigation.pop(),
          },
          {
            text: 'View Cart',
            onPress: () => {
              navigation.popToTop();

              navigation.getParent()?.getParent()?.navigate("Cart", {
  isAdmin: false,
  userName: userName,
  refresh: Date.now(),
});
            },
          },
        ]);
      });
    });
  };

  return (
    <View style={s.page}>
      <ScrollView style={s.container} contentContainerStyle={s.scrollContent}>
        <View style={s.imageCard}>
          <Image
            source={getImageSource(product.image)}
            style={s.hero}
            resizeMode="contain"
          />
        </View>

        <View style={s.contentCard}>
          <View style={s.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{product.title}</Text>
              <Text style={s.sellerText}>
                Sold by {product.seller || 'Monarch Store'}
              </Text>
            </View>

            <View style={s.categoryTag}>
              <Text style={s.categoryText}>{product.category || 'Others'}</Text>
            </View>
          </View>

          <Text style={s.price}>
            RM {Number(product.price || 0).toFixed(2)}
          </Text>

          <View style={s.statsRow}>
            <View style={s.stockBox}>
              <Icon name="cube-outline" size={18} color="#e67e22" />
              <View>
                <Text style={s.statLabel}>Stock</Text>
                <Text style={s.stockText}>{product.stock}</Text>
              </View>
            </View>

            <View style={s.soldBox}>
              <Icon name="flame-outline" size={18} color="#16a34a" />
              <View>
                <Text style={s.statLabel}>Sold</Text>
                <Text style={s.soldText}>{product.sold || 0}</Text>
              </View>
            </View>
          </View>

          <View style={s.descHeader}>
            <Icon name="document-text-outline" size={21} color="#3498db" />
            <Text style={s.sec}>Product Description</Text>
          </View>

          <View style={s.descBox}>
            <Text style={s.desc}>
              {product.description || 'No description available.'}
            </Text>
          </View>

          {isAdmin && (
            <View style={s.adminBox}>
              <Icon name="eye-outline" size={22} color="#95a5a6" />
              <Text style={s.adminTxt}>View Only (Admin Mode)</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {!isAdmin && (
        <View style={s.footer}>
          <View style={s.qtyContainer}>
            <Text style={s.qtyLabel}>Quantity</Text>

            <View style={s.qtyRow}>
              <TouchableOpacity
                onPress={() => qty > 1 && setQty(qty - 1)}
                style={[s.qBtn, qty === 1 && s.disabledQtyBtn]}
              >
                <Icon
                  name="remove"
                  size={20}
                  color={qty === 1 ? '#95a5a6' : '#fff'}
                />
              </TouchableOpacity>

              <Text style={s.qNum}>{qty}</Text>

              <TouchableOpacity
                onPress={() => qty < Number(product.stock) && setQty(qty + 1)}
                style={[
                  s.qBtn,
                  qty >= Number(product.stock) && s.disabledQtyBtn,
                ]}
              >
                <Icon
                  name="add"
                  size={20}
                  color={qty >= Number(product.stock) ? '#95a5a6' : '#fff'}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={onAdd}
            style={[s.mainBtn, isGuest && s.guestBtn]}
          >
            <Icon
              name={isGuest ? 'log-in-outline' : 'cart-outline'}
              size={21}
              color="#fff"
            />
            <Text style={s.w}>{isGuest ? 'Login Required' : 'Add to Cart'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={modal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetIcon}>
              <Icon name="person-circle-outline" size={42} color="#3498db" />
            </View>

            <Text style={s.sheetTitle}>Account Needed</Text>

            <Text style={s.sheetDesc}>
              Please log in before purchasing items.
            </Text>

            <TouchableOpacity
              style={s.modalMainBtn}
              onPress={() => {
                setModal(false);
                navigation.getParent()?.getParent()?.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }}
            >
              <Text style={s.w}>Go to Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.modalCancelBtn}
              onPress={() => setModal(false)}
            >
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 155,
  },

  imageCard: {
    backgroundColor: '#fff',
    margin: 18,
    borderRadius: 22,
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
  },

  hero: {
    width: '90%',
    height: '90%',
  },

  contentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 18,
    padding: 20,
    borderRadius: 22,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
  },

  sellerText: {
    color: '#95a5a6',
    marginTop: 5,
    fontSize: 13,
    fontWeight: '600',
  },

  categoryTag: {
    backgroundColor: '#ebf5fb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  categoryText: {
    color: '#3498db',
    fontSize: 12,
    fontWeight: 'bold',
  },

  price: {
    fontSize: 25,
    color: '#3498db',
    fontWeight: 'bold',
    marginTop: 18,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },

  stockBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    padding: 13,
    gap: 10,
  },

  soldBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 14,
    padding: 13,
    gap: 10,
  },

  statLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    fontWeight: '700',
  },

  stockText: {
    color: '#e67e22',
    fontWeight: 'bold',
    fontSize: 15,
    marginTop: 2,
  },

  soldText: {
    color: '#16a34a',
    fontWeight: 'bold',
    fontSize: 15,
    marginTop: 2,
  },

  descHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 10,
  },

  sec: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#334155',
  },

  descBox: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eef2f7',
    minHeight: 105,
  },

  desc: {
    color: '#64748b',
    lineHeight: 22,
    fontSize: 15,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
  },

  qtyContainer: {
    marginRight: 12,
  },

  qtyLabel: {
    color: '#7f8c8d',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
  },

  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    borderRadius: 14,
    padding: 5,
  },

  qBtn: {
    backgroundColor: '#3498db',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledQtyBtn: {
    backgroundColor: '#ecf0f1',
  },

  qNum: {
    width: 38,
    textAlign: 'center',
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: 'bold',
  },

  mainBtn: {
    flex: 1,
    backgroundColor: '#3498db',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  guestBtn: {
    backgroundColor: '#bdc3c7',
  },

  w: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  adminBox: {
    marginTop: 20,
    padding: 18,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  adminTxt: {
    color: '#95a5a6',
    fontWeight: 'bold',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 35,
  },

  sheet: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 22,
    alignItems: 'center',
  },

  sheetIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ebf5fb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  sheetTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },

  sheetDesc: {
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },

  modalMainBtn: {
    width: '100%',
    backgroundColor: '#3498db',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCancelBtn: {
    marginTop: 12,
  },

  modalCancelText: {
    color: '#7f8c8d',
    fontWeight: '700',
  },
});