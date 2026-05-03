import { BASE_URL } from "./productCloudService";

export const createCloudOrder = async (order: any) => {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  return await res.json();
};

export const getCloudOrders = async () => {
  const res = await fetch(`${BASE_URL}/orders`);
  return await res.json();
};

export const updateCloudOrderStatus = async (orderId: string, status: string) => {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return await res.json();
};