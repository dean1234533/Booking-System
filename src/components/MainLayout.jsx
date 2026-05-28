// components/MainLayout.js
function MainLayout() {
  return (
    <>
      <Nav platformName="yr-bookd" />
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet /> 
      </Box>
      <Footer />
    </>
  );
}