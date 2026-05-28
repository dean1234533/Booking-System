import React, { useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import PaletteIcon from "@mui/icons-material/Palette";
import WebIcon     from "@mui/icons-material/Web";
import DesignTab   from "./DesignTab";
import WebsiteTab  from "./WebsiteTab";

export default function BrandSiteTab({
  profile, setProfile, brandColor,
  showWebsite,
  logoPreview,          setLogoFile,          setLogoPreview,
  heroPreviewDesktop,   setHeroFileDesktop,   setHeroPreviewDesktop,
  heroPreviewMobile,    setHeroFileMobile,    setHeroPreviewMobile,
  handleImageChange,
}) {
  const [sub, setSub] = useState(0);

  const subTabs = [
    { label: "Branding",        icon: <PaletteIcon sx={{ fontSize: 16 }} /> },
    ...(showWebsite ? [{ label: "Website Content", icon: <WebIcon sx={{ fontSize: 16 }} /> }] : []),
  ];

  return (
    <Box>
      {subTabs.length > 1 && (
        <Tabs
          value={sub}
          onChange={(_, v) => setSub(v)}
          sx={{
            mb: 3,
            borderBottom: "1px solid #eee",
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.85rem",
              minHeight: 40,
              gap: 0.5,
            },
            "& .Mui-selected":      { color: `${brandColor} !important` },
            "& .MuiTabs-indicator": { bgcolor: brandColor },
          }}
        >
          {subTabs.map(t => (
            <Tab key={t.label} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      )}

      {sub === 0 && (
        <DesignTab
          profile={profile}
          setProfile={setProfile}
          logoPreview={logoPreview}
          setLogoFile={setLogoFile}
          setLogoPreview={setLogoPreview}
          heroPreviewDesktop={heroPreviewDesktop}
          setHeroFileDesktop={setHeroFileDesktop}
          setHeroPreviewDesktop={setHeroPreviewDesktop}
          heroPreviewMobile={heroPreviewMobile}
          setHeroFileMobile={setHeroFileMobile}
          setHeroPreviewMobile={setHeroPreviewMobile}
          handleImageChange={handleImageChange}
        />
      )}

      {sub === 1 && showWebsite && (
        <WebsiteTab
          profile={profile}
          setProfile={setProfile}
          brandColor={brandColor}
        />
      )}
    </Box>
  );
}
