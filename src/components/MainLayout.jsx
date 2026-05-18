// components/MainLayout.js
function MainLayout() {
  return (
    <>
      <Nav platformName="Book-eh-Trim" />
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet /> 
      </Box>
      <Footer />
    </>
  );
}