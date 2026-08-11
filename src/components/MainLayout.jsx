// components/MainLayout.js
function MainLayout() {
  return (
    <>
      <Nav platformName="Bookrightly" />
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet /> 
      </Box>
      <Footer />
    </>
  );
}