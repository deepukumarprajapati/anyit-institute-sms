import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface PermissionsContextType {
  permissions: string[];
  hasPermission: (key: string) => boolean;
  loading: boolean;
  fetchPermissions: () => void;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: [],
  hasPermission: () => false,
  loading: false,
  fetchPermissions: () => {},
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPermissions = useCallback(async () => {
    if (!user || user.role !== "teacher") return;
    setLoading(true);
    try {
      const res = await api.get(`/permissions/${user.id}`);
      setPermissions(res.data?.data?.permissions || []);
    } catch {
      // If no permission doc yet, fall back to Teacher.permissions booleans
      try {
        const meRes = await api.get("/teachers/permissions");
        const boolMap = meRes.data?.permissions || {};
        const keys = Object.entries(boolMap)
          .filter(([, v]) => v === true)
          .map(([k]) => k);
        setPermissions(keys);
      } catch {
        setPermissions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "teacher") {
      fetchPermissions();
    } else {
      setPermissions([]);
    }
  }, [user, fetchPermissions]);

  const hasPermission = useCallback((key: string) => permissions.includes(key), [permissions]);

  return (
    <PermissionsContext.Provider value={{ permissions, hasPermission, loading, fetchPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
