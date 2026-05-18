// components/ShopLayout.js
function ShopLayout() {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const { pathname } = useLocation();
  const hostname = window.location.hostname;

  useEffect(() => {
    async function load() {
      // 1. Try to get ID from URL (/shop/:id)
      const match = matchPath("/shop/:id", pathname);
      let data = null;

      if (match?.params.id) {
        data = await getBarberById(match.params.id);
      } else {
        // 2. Otherwise try the domain
        data = await getBarberByDomain(hostname);
      }
      setTenant(data);
      setLoading(false);
    }
    load();
  }, [hostname, pathname]);

  if (loading) return <CircularProgress />;
  if (!tenant) return <Navigate to="/" replace />; // Send back to marketplace if shop doesn't exist

  return (
    <>
      <TenantNav tenant={tenant} />
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet context={[tenant]} /> {/* This renders the child page */}
      </Box>
      <TenantFooter tenant={tenant} />
    </>
  );
}