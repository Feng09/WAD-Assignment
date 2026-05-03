export const BASE_URL = "http://10.0.2.2:3000";
//android 

export const getCloudProducts = async () => {
  const res = await fetch(`${BASE_URL}/products`);
  return await res.json();
};

export const createCloudProduct = async (product: any) => {
  const res = await fetch(`${BASE_URL}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });

  return await res.json();
};

export const updateCloudProduct = async (cloudId: string, product: any) => {
  const res = await fetch(`${BASE_URL}/products/${cloudId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });

  return await res.json();
};

export const deleteCloudProduct = async (cloudId: string) => {
  const res = await fetch(`${BASE_URL}/products/${cloudId}`, {
    method: "DELETE",
  });

  return await res.json();
};

export const updateCloudProductPurchase = async (
  cloudId: string,
  quantity: number
) => {
  const res = await fetch(`${BASE_URL}/products/${cloudId}/purchase`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ quantity }),
  });

  return await res.json();
};