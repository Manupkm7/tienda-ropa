export async function actualizarEstadoOrden(id: string, estado: string) {
  const formData = new FormData();
  formData.set("estado", estado);

  const res = await fetch(`/api/admin/ordenes/${id}/estado`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("No se pudo actualizar el estado de la orden");
  }
}

export async function guardarNotaOrden(id: string, nota: string) {
  const formData = new FormData();
  formData.set("nota", nota);

  const res = await fetch(`/api/admin/ordenes/${id}/nota`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("No se pudo guardar la nota");
  }
}

export async function actualizarTrackingOrden(id: string, trackingId: string) {
  const formData = new FormData();
  formData.set("trackingId", trackingId);

  const res = await fetch(`/api/admin/ordenes/${id}/tracking`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("No se pudo actualizar el tracking");
  }
}

