import type { ScheduleConfig } from '../types'

export const SCHEDULES: ScheduleConfig = {
  red: {
    regular: [
      { name: 'Red1-Algebra', startTime: '08:25', endTime: '09:45',
        students: ['Liam','Flynn','Brayden','Dominic','Lea','Avram','Geiger','Pablo','Josiah','Johnathan','Mira','Cody','Camryn','Hayden','William','Addison','Allegra','Kolter','Stockton','Rosemary','Olivia','Matthias','Winston','Keelee','Emylene'] },
      { name: 'Red2-Algebra', startTime: '10:40', endTime: '12:00',
        students: ['Teagen','Samuel','Molly','Leo','Konrad','Hunter','Signe','Imanol','Collin','James','Juan','Sofia','Brooke','Tysen','Mia','Sullivan','Avarie','Jayda','Helen','Ramos','Luca','Daniel','Lockey','Ezequiel','David'] },
      { name: 'Red3-PreAlgebra', startTime: '12:50', endTime: '14:10',
        students: ['Ace','Blake','Ari','Cooper','Landen','Kyndal','Jeniel','Marseale','Noah','Liam','Fisher','Quinn'] },
    ],
    late: [
      { name: 'Red1-Algebra', startTime: '09:35', endTime: '10:50',
        students: ['Liam','Flynn','Brayden','Dominic','Lea','Avram','Geiger','Pablo','Josiah','Johnathan','Mira','Cody','Camryn','Hayden','William','Addison','Allegra','Kolter','Stockton','Rosemary','Olivia','Matthias','Winston','Keelee','Emylene'] },
      { name: 'Red2-Algebra', startTime: '11:05', endTime: '12:20',
        students: ['Teagen','Samuel','Molly','Leo','Konrad','Hunter','Signe','Imanol','Collin','James','Juan','Sofia','Brooke','Tysen','Mia','Sullivan','Avarie','Jayda','Helen','Ramos','Luca','Daniel','Lockey','Ezequiel','David'] },
      { name: 'Red3-PreAlgebra', startTime: '13:00', endTime: '14:15',
        students: ['Ace','Blake','Ari','Cooper','Landen','Kyndal','Jeniel','Marseale','Noah','Liam','Fisher','Quinn'] },
    ],
  },
  black: {
    regular: [
      { name: 'Black2-Geometry', startTime: '10:40', endTime: '12:00',
        students: ['Oliver','Jackson','Hunter','Sara','Daniel','Cecily','Noah','Logan','Maren','Stella','Braeden','Landon','Portocarrero','Caelan','Violet','Annabella','Edmund','River','Vasquez','Avery','Shelby','Charlie','Wyatt','Turner','Lauren','Ruby','Adelaide'] },
      { name: 'Black3-Geometry', startTime: '12:50', endTime: '14:10',
        students: ['Kaia','Charlotte','Ella','Evelyn','Willa','Lucy','Mya','Delilah','Henry','Dylan','Josiah','Taylor','Michael','Aubree','Kendall','Amara','Cade','Norman','Macy','Delaney','Adela','Treak','Opal','Phong'] },
      { name: 'Black4-Algebra', startTime: '14:15', endTime: '15:35',
        students: ['Sophia','Emmaline','Julian','Connor','Molly','Kinsley','Ella','Addison','Savanna','Fox','Gus','Lyten','Sunny','Harper','Bo','Aurora','Addelynn','Kendyl','Benjamin','Mallory','Grace','Allie','Naomi','Lucille'] },
    ],
    late: [
      { name: 'Black2-Geometry', startTime: '11:05', endTime: '12:20',
        students: ['Oliver','Jackson','Hunter','Sara','Daniel','Cecily','Noah','Logan','Maren','Stella','Braeden','Landon','Portocarrero','Caelan','Violet','Annabella','Edmund','River','Vasquez','Avery','Shelby','Charlie','Wyatt','Turner','Lauren','Ruby','Adelaide'] },
      { name: 'Black3-Geometry', startTime: '13:00', endTime: '14:15',
        students: ['Kaia','Charlotte','Ella','Evelyn','Willa','Lucy','Mya','Delilah','Henry','Dylan','Josiah','Taylor','Michael','Aubree','Kendall','Amara','Cade','Norman','Macy','Delaney','Adela','Treak','Opal','Phong'] },
      { name: 'Black4-Algebra', startTime: '14:20', endTime: '15:35',
        students: ['Sophia','Emmaline','Julian','Connor','Molly','Kinsley','Ella','Addison','Savanna','Fox','Gus','Lyten','Sunny','Harper','Bo','Aurora','Addelynn','Kendyl','Benjamin','Mallory','Grace','Allie','Naomi','Lucille'] },
    ],
  },
}
