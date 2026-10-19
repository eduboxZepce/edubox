'use client';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import QueryState from '@/components/feedback/QueryState';
import Form from '@/components/form/Form';
import FormActions from '@/components/form/FormActions';
import FormTextField from '@/components/form/FormTextField';
import { useZodForm } from '@/lib/forms/useZodForm';
import { usePaymentSettings, useUpdatePaymentSettings } from '@/hooks/useSiteContent';
import {
  paymentSettingsFormSchema,
  toPaymentSettingsPayload,
  type PaymentSettingsFormValues,
} from '@/lib/schemas/payment-settings-form.schema';
import { formatDateTime } from '@/lib/format';
import { toast } from '@/store/useToastStore';
import type { PaymentSettings } from '@/lib/schemas/payment.schema';

/**
 * Where the money goes — the seller's details, shown to a student alongside
 * their payment reference when they request a course.
 *
 * Admin only. `requireAdmin` in the route and an admin-only RLS policy say the
 * same thing twice on purpose: there is one seller, and it is the platform's,
 * not a course author's.
 *
 * The form renders **inside** `<QueryState
          skeleton="form">` because `defaultValues` is read
 * once at mount — the standing rule for every edit form in this codebase.
 */
function PaymentSettingsForm({ settings }: { settings: PaymentSettings }) {
  const update = useUpdatePaymentSettings();

  const form = useZodForm(paymentSettingsFormSchema, {
    defaultValues: {
      seller_name: settings.seller_name ?? '',
      address: settings.address ?? '',
      postal_code: settings.postal_code ?? '',
      city: settings.city ?? '',
      country: settings.country ?? '',
      bank_name: settings.bank_name ?? '',
      account_number: settings.account_number ?? '',
      swift: settings.swift ?? '',
      tax_id: settings.tax_id ?? '',
      payment_purpose_template: settings.payment_purpose_template ?? '',
      note: settings.note ?? '',
    },
  });

  // No try/catch: throwing is how a submit handler reports failure, and
  // <Form> surfaces it.
  async function onSubmit(values: PaymentSettingsFormValues) {
    await update.mutateAsync(toPaymentSettingsPayload(values));
    toast.success('Podaci za uplatu su sačuvani.');
  }

  return (
    <Form form={form} onSubmit={onSubmit}>
      <ContentCard title="Primalac" description="Ko izdaje račun i kome student uplaćuje.">
        <Stack spacing={2}>
          <FormTextField name="seller_name" label="Naziv primaoca" required />
          <FormTextField name="address" label="Adresa" />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormTextField name="postal_code" label="Poštanski broj" />
            <FormTextField name="city" label="Grad" />
            <FormTextField name="country" label="Država" />
          </Stack>
          <FormTextField name="tax_id" label="ID broj / PDV broj" />
        </Stack>
      </ContentCard>

      <ContentCard title="Račun" description="Podaci koje student unosi u nalog za plaćanje.">
        <Stack spacing={2}>
          <FormTextField name="bank_name" label="Banka" />
          <FormTextField
            name="account_number"
            label="Broj računa"
            required
            helperText="Unosi se tačno onako kako treba biti prepisan u nalog za plaćanje."
          />
          <FormTextField
            name="swift"
            label="SWIFT / BIC"
            helperText="Potrebno samo za uplate iz inostranstva."
          />
        </Stack>
      </ContentCard>

      <ContentCard
        title="Svrha uplate i napomena"
        description="Tekst koji student vidi uz svoj poziv na broj."
      >
        <Stack spacing={2}>
          <FormTextField
            name="payment_purpose_template"
            label="Predložak svrhe uplate"
            helperText="Koristite {reference} za poziv na broj i {course} za naziv obuke."
          />
          <FormTextField
            name="note"
            label="Napomena studentu"
            multiline
            rows={3}
            helperText="Opciono — npr. koliko dugo traje obrada uplate."
          />
        </Stack>
      </ContentCard>

      <FormActions submitLabel="Sačuvaj" cancelHref="/admin" />

      <Typography variant="caption" color="text.secondary">
        Zadnja izmjena: {formatDateTime(settings.updated_at)}
      </Typography>
    </Form>
  );
}

export default function AdminPaymentSettingsPage() {
  const settings = usePaymentSettings();

  return (
    <PageContainer maxWidth="form">
      <PageHeader
        breadcrumbs={[{ label: 'Kontrolna ploča', href: '/admin' }, { label: 'Podaci za uplatu' }]}
        title="Podaci za uplatu"
        description="Prikazuju se studentu uz poziv na broj kada zatraži pristup obuci."
      />

      <QueryState query={settings} errorTitle="Podatke nije moguće učitati">
        {(data) => <PaymentSettingsForm settings={data} />}
      </QueryState>
    </PageContainer>
  );
}
