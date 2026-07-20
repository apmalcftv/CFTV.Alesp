import type { Control, FieldPath, FieldValues } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboboxCriavel } from "@/components/cadastros/combobox-criavel";

interface CampoBase<F extends FieldValues> {
  control: Control<F>;
  name: FieldPath<F>;
  label: string;
}

export function CampoTexto<F extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type = "text",
}: CampoBase<F> & { placeholder?: string; type?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              placeholder={placeholder}
              type={type}
              {...field}
              value={(field.value as string | number | undefined) ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function CampoTextarea<F extends FieldValues>({
  control,
  name,
  label,
  placeholder,
}: CampoBase<F> & { placeholder?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea
              placeholder={placeholder}
              {...field}
              value={(field.value as string | undefined) ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function CampoSelect<F extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  opcoes,
  disabled,
}: CampoBase<F> & {
  placeholder?: string;
  opcoes: { valor: string; rotulo: string }[];
  disabled?: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            value={(field.value as string) || undefined}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {opcoes.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function CampoComboboxCriavel<F extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  opcoes,
  aoCriar,
  rotuloCriar,
}: CampoBase<F> & {
  placeholder?: string;
  opcoes: { valor: string; rotulo: string }[];
  aoCriar?: (termo: string) => Promise<string | undefined>;
  rotuloCriar?: (termo: string) => string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <ComboboxCriavel
              value={(field.value as string) ?? ""}
              onChange={field.onChange}
              opcoes={opcoes}
              placeholder={placeholder}
              aoCriar={aoCriar}
              rotuloCriar={rotuloCriar}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function CampoCheckbox<F extends FieldValues>({
  control,
  name,
  label,
}: CampoBase<F>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center gap-2 space-y-0">
          <FormControl>
            <Checkbox
              checked={field.value as boolean}
              onCheckedChange={field.onChange}
            />
          </FormControl>
          <FormLabel className="font-normal">{label}</FormLabel>
        </FormItem>
      )}
    />
  );
}
