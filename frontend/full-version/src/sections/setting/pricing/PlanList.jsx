// @mui
// import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';

// @project
import MainCard from '@/components/MainCard';
import PricingPlanTable from '@/sections/setting/pricing/pricing-plan-table/PricingPlanTable';

// @assets
// import { IconPlus } from '@tabler/icons-react';

/***************************  PRICING - PLAN LIST  ***************************/

export default function PlanList() {
  return (
    <MainCard sx={{ p: 0 }}>
      <CardHeader
        title="Pricing Plan"
        subheader="List of pricing Plan"
        // action={
        //   <Button variant="contained" startIcon={<IconPlus size={16} />}>
        //     Add Plan
        //   </Button>
        // }
        titleTypographyProps={{ sx: { fontWeight: 400 } }}
        subheaderTypographyProps={{ variant: 'body2', sx: { color: 'grey.700' } }}
        sx={{ p: { xs: 1.75, sm: 2.25, md: 3 } }}
      />
      <Divider />
      <PricingPlanTable />
    </MainCard>
  );
}
