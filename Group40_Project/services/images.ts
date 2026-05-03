export const imgMap: { [key: string]: any } = {
  'denim': require('../img/denimJacket.jpeg'),
  'audio': require('../img/wirelessHeadphones.jpg'),
  'watch': require('../img/fitnessWatch.jpg'),
  'bag': require('../img/travelBag.jpg'),
  'toy': require('../img/ultrama.jpg'),
  'kb': require('../img/keyboard.jpg'),
  'album': require('../img/laufey.jpg'),
  'gun': require('../img/gun.jpg'),
  'phone': require('../img/samsung.jpg'),
  'shirt': require('../img/tigerwoods.jpg'),
  'p1': require('../img/p1.jpg'),
};

export const getImg = (id: any) => imgMap[id] || imgMap['denim'];