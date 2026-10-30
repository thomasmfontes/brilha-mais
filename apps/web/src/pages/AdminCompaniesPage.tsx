import React from "react";
import { motion } from "framer-motion";
import CompanyManagementTab from "../components/admin/CompanyManagementTab";

export default function AdminCompaniesPage() {
  return (
    <div className="space-y-8 w-full pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Empresas Parceiras
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestão de empresas conveniadas, emissão de convites e contratações do Banco de Talentos.
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <CompanyManagementTab />
      </motion.div>
    </div>
  );
}
