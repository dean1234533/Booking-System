// components/MainLayout.js
function MainLayout() {
  return (
    <>
      <Nav platformName="Bookrty" />
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet /> 
      </Box>
      <Footer />
    </>
  );
}